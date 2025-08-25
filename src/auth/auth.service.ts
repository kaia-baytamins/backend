import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as crypto from 'crypto';

import { User, Pet, Spaceship, PetType, SpaceshipType } from '../entities';
import { WalletLoginDto, NonceRequestDto, LineLoginDto } from './dto/auth.dto';
import { UserStats } from '../entities/user-stats.entity';

interface JwtPayload {
  sub: string;
  walletAddress?: string;
  lineUserId?: string;
  type: 'access' | 'refresh';
}

@Injectable()
export class AuthService {
  private readonly nonceStore = new Map<
    string,
    { nonce: string; timestamp: number }
  >();
  private readonly nonceExpiration = 5 * 60 * 1000; // 5 minutes

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(Spaceship)
    private readonly spaceshipRepository: Repository<Spaceship>,
    @InjectRepository(UserStats)
    private readonly userStatsRepository: Repository<UserStats>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Generate a nonce for wallet authentication
   */
  async generateNonce(
    nonceRequestDto: NonceRequestDto,
  ): Promise<{ nonce: string; message: string }> {
    const { walletAddress } = nonceRequestDto;

    // Generate random nonce
    const nonce = crypto.randomBytes(16).toString('hex');
    const timestamp = Date.now();

    // Store nonce with timestamp
    this.nonceStore.set(walletAddress.toLowerCase(), { nonce, timestamp });

    // Clean up expired nonces
    this.cleanExpiredNonces();

    const message = `Please sign this message to authenticate with KAIA Game: ${nonce}`;

    return { nonce, message };
  }

  /**
   * Authenticate user with wallet signature
   */
  async walletLogin(walletLoginDto: WalletLoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: User;
  }> {
    const { walletAddress, signature, message, lineUserId } = walletLoginDto;

    // Verify the signature
    const isValidSignature = await this.verifySignature(
      walletAddress,
      message,
      signature,
    );
    if (!isValidSignature) {
      throw new UnauthorizedException('Invalid signature');
    }

    // Extract and verify nonce from message
    const nonce = this.extractNonceFromMessage(message);
    if (!this.verifyNonce(walletAddress, nonce)) {
      throw new UnauthorizedException('Invalid or expired nonce');
    }

    // Remove used nonce
    this.nonceStore.delete(walletAddress.toLowerCase());

    // Find or create user
    let user = await this.userRepository.findOne({
      where: { walletAddress: walletAddress.toLowerCase() },
      relations: ['pet', 'spaceship'],
    });

    if (!user) {
      user = await this.createNewUser(walletAddress, lineUserId);
    } else {
      // Update LINE user ID if provided
      if (lineUserId && user.lineUserId !== lineUserId) {
        user.lineUserId = lineUserId;
        user.lastLoginAt = new Date();
        await this.userRepository.save(user);
      }
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateTokens(user);

    return { accessToken, refreshToken, user };
  }

  /**
   * LINE authentication - simplified version
   */
  async lineLogin(lineLoginDto: LineLoginDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: User;
    isNewUser: boolean;
  }> {
    const { lineUserId, displayName } = lineLoginDto;

    // Find or create user by LINE ID
    let user = await this.userRepository.findOne({
      where: { lineUserId },
      relations: ['pet', 'spaceship', 'stats'],
    });

    let isNewUser = false;
    if (!user) {
      user = await this.createNewLineUser(lineUserId, displayName);
      isNewUser = true;
    } else {
      // Update profile info and last login
      if (displayName && user.username !== displayName) {
        user.username = displayName;
      }
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);
    }

    // Generate tokens
    const { accessToken, refreshToken } =
      await this.generateTokensForLineUser(user);

    return { accessToken, refreshToken, user, isNewUser };
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    refreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify(refreshToken) as JwtPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or inactive');
      }

      return await this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  /**
   * Validate user by ID (used by JWT strategy)
   */
  async validateUser(userId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['pet', 'spaceship'],
    });

    return user;
  }

  /**
   * Verify wallet signature
   */
  private async verifySignature(
    walletAddress: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    try {
      const messageHash = ethers.hashMessage(message);
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);
      return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract nonce from signed message
   */
  private extractNonceFromMessage(message: string): string {
    const match = message.match(/KAIA Game: (.+)$/);
    return match ? match[1] : '';
  }

  /**
   * Verify nonce validity
   */
  private verifyNonce(walletAddress: string, nonce: string): boolean {
    const stored = this.nonceStore.get(walletAddress.toLowerCase());
    if (!stored) return false;

    const isExpired = Date.now() - stored.timestamp > this.nonceExpiration;
    if (isExpired) {
      this.nonceStore.delete(walletAddress.toLowerCase());
      return false;
    }

    return stored.nonce === nonce;
  }

  /**
   * Create new user with default pet and spaceship
   */
  private async createNewUser(
    walletAddress: string,
    lineUserId?: string,
  ): Promise<User> {
    const user = this.userRepository.create({
      walletAddress: walletAddress.toLowerCase(),
      lineUserId,
      lastLoginAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);
    await this.createDefaultAssetsAndStats(savedUser);
    return savedUser;
  }

  /**
   * Create new LINE user (without wallet)
   */
  private async createNewLineUser(
    lineUserId: string,
    displayName?: string,
  ): Promise<User> {
    const user = this.userRepository.create({
      lineUserId,
      username: displayName,
      lastLoginAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);
    await this.createDefaultAssetsAndStats(savedUser);
    return savedUser;
  }

  /**
   * Create default pet, spaceship, and stats for new user
   */
  private async createDefaultAssetsAndStats(user: User): Promise<void> {
    // Create default pet
    const pet = this.petRepository.create({
      name: 'Companion',
      type: PetType.DOG,
      ownerId: user.id,
    });

    // Create default spaceship
    const spaceship = this.spaceshipRepository.create({
      name: 'Explorer I',
      type: SpaceshipType.BASIC,
      ownerId: user.id,
    });

    // Create user stats
    const stats = this.userStatsRepository.create({
      userId: user.id,
    });

    await Promise.all([
      this.petRepository.save(pet),
      this.spaceshipRepository.save(spaceship),
      this.userStatsRepository.save(stats),
    ]);
  }

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      walletAddress: user.walletAddress,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get('jwt.expirationTime'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d', // Refresh token valid for 7 days
    });

    return { accessToken, refreshToken };
  }

  /**
   * Generate tokens for LINE user
   */
  private async generateTokensForLineUser(
    user: User,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const accessPayload: JwtPayload = {
      sub: user.id,
      lineUserId: user.lineUserId,
      type: 'access',
    };

    const refreshPayload: JwtPayload = {
      sub: user.id,
      lineUserId: user.lineUserId,
      type: 'refresh',
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      expiresIn: this.configService.get('jwt.expirationTime'),
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  /**
   * Clean up expired nonces
   */
  private cleanExpiredNonces(): void {
    const now = Date.now();
    for (const [address, data] of this.nonceStore.entries()) {
      if (now - data.timestamp > this.nonceExpiration) {
        this.nonceStore.delete(address);
      }
    }
  }
}
