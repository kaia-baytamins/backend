import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, Pet, Spaceship, PetType, SpaceshipType } from '../entities';
import { SimpleLineLoginDto } from './dto/auth.dto';
import { UserStats } from '../entities/user-stats.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(Spaceship)
    private readonly spaceshipRepository: Repository<Spaceship>,
    @InjectRepository(UserStats)
    private readonly userStatsRepository: Repository<UserStats>,
  ) {}

  /**
   * Simplified LINE authentication for hackathon
   * Just trust the frontend userProfile data
   */
  async simpleLineLogin(loginDto: SimpleLineLoginDto): Promise<{
    user: User;
    isNewUser: boolean;
  }> {
    const { userId, displayName, pictureUrl } = loginDto;

    // Find or create user by LINE ID
    let user = await this.userRepository.findOne({
      where: { lineUserId: userId },
      relations: ['pet', 'spaceship', 'stats'],
    });

    let isNewUser = false;
    if (!user) {
      user = await this.createNewLineUser(userId, displayName, pictureUrl);
      isNewUser = true;
    } else {
      // Update profile info and last login
      if (displayName && user.username !== displayName) {
        user.username = displayName;
      }
      if (pictureUrl && user.avatar !== pictureUrl) {
        user.avatar = pictureUrl;
      }
      user.lastLoginAt = new Date();
      await this.userRepository.save(user);
    }

    return { user, isNewUser };
  }

  /**
   * Get user by LINE ID (used by simplified middleware)
   */
  async getUserByLineId(lineUserId: string): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { lineUserId, isActive: true },
      relations: ['pet', 'spaceship', 'stats'],
    });

    return user;
  }

  /**
   * Create new LINE user (hackathon simplified)
   */
  private async createNewLineUser(
    lineUserId: string,
    displayName?: string,
    pictureUrl?: string,
  ): Promise<User> {
    const user = this.userRepository.create({
      lineUserId,
      username: displayName,
      avatar: pictureUrl,
      lastLoginAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);
    await this.createDefaultAssetsAndStats(savedUser);
    return savedUser;
  }

  /**
   * Create default spaceship and stats for new user (pet selection comes later)
   */
  private async createDefaultAssetsAndStats(user: User): Promise<void> {
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
      this.spaceshipRepository.save(spaceship),
      this.userStatsRepository.save(stats),
    ]);
  }

  /**
   * Select or update pet for user
   */
  async selectPet(lineUserId: string, petType: PetType): Promise<Pet> {
    const user = await this.userRepository.findOne({
      where: { lineUserId },
      relations: ['pet'],
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Get pet name based on type
    const petNames = {
      [PetType.MOMOCO]: 'Momoco',
      [PetType.PANLULU]: 'Panlulu',
      [PetType.HOSHITANU]: 'Hoshitanu',
      [PetType.MIZURU]: 'Mizuru',
    };

    if (user.pet) {
      // Update existing pet
      user.pet.name = petNames[petType];
      user.pet.type = petType;
      return await this.petRepository.save(user.pet);
    } else {
      // Create new pet
      const pet = this.petRepository.create({
        name: petNames[petType],
        type: petType,
        ownerId: user.id,
      });
      return await this.petRepository.save(pet);
    }
  }
}
