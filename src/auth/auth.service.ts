import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import * as crypto from 'crypto';

import { User, Pet, Spaceship, PetType, SpaceshipType } from '../entities';
import { WalletLoginDto, NonceRequestDto } from './dto/auth.dto';

interface JwtPayload {
  sub: string;
  walletAddress: string;
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

    // Create default pet
    const pet = this.petRepository.create({
      name: 'Companion',
      type: PetType.DOG,
      ownerId: savedUser.id,
    });

    // Create default spaceship
    const spaceship = this.spaceshipRepository.create({
      name: 'Explorer I',
      type: SpaceshipType.BASIC,
      ownerId: savedUser.id,
    });

    await Promise.all([
      this.petRepository.save(pet),
      this.spaceshipRepository.save(spaceship),
    ]);

    return savedUser;
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
