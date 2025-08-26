import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User, Pet, Spaceship, PetType, SpaceshipType } from '../entities';
import { UpdateUserProfileDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(Spaceship)
    private readonly spaceshipRepository: Repository<Spaceship>,
  ) {}

  /**
   * Get user profile with all related data
   */
  async getUserProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true },
      relations: ['pet', 'spaceship', 'spaceship.items'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Get user profile with all related data using lineUserId
   */
  async getUserProfileByLineId(lineUserId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { lineUserId, isActive: true },
      relations: ['pet', 'spaceship', 'spaceship.items'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Update user profile
   */
  async updateProfile(
    userId: string,
    updateData: UpdateUserProfileDto,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if username is already taken
    if (updateData.username) {
      const existingUser = await this.userRepository.findOne({
        where: { username: updateData.username },
      });

      if (existingUser && existingUser.id !== userId) {
        throw new BadRequestException('Username already taken');
      }
    }

    Object.assign(user, updateData);
    return await this.userRepository.save(user);
  }

  /**
   * Update user wallet address
   */
  async updateWalletAddress(
    userId: string,
    walletAddress: string,
  ): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Basic wallet address validation (Ethereum format)
    const walletRegex = /^0x[a-fA-F0-9]{40}$/;
    if (!walletRegex.test(walletAddress)) {
      throw new BadRequestException('Invalid wallet address format');
    }

    user.walletAddress = walletAddress;
    user.lastLoginAt = new Date();

    return await this.userRepository.save(user);
  }

  /**
   * Initialize user's pet and spaceship
   */
  async initializeUserAssets(
    user: User,
    petType: PetType = PetType.MOMOCO,
  ): Promise<void> {
    // Create default pet
    const pet = this.petRepository.create({
      name: `${petType.charAt(0).toUpperCase() + petType.slice(1)} Companion`,
      type: petType,
      ownerId: user.id,
    });

    // Create default spaceship
    const spaceship = this.spaceshipRepository.create({
      name: 'Explorer I',
      type: SpaceshipType.BASIC,
      ownerId: user.id,
    });

    await Promise.all([
      this.petRepository.save(pet),
      this.spaceshipRepository.save(spaceship),
    ]);
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId: string): Promise<any> {
    const user = await this.getUserProfile(userId);

    return {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      level: user.level,
      experience: user.experience,
      totalExplorations: user.totalExplorations,
      successfulExplorations: user.successfulExplorations,
      totalStaked: user.totalStaked,
      successRate:
        user.totalExplorations > 0
          ? (user.successfulExplorations / user.totalExplorations) * 100
          : 0,
      pet: user.pet
        ? {
            name: user.pet.name,
            type: user.pet.type,
            level: user.pet.level,
            totalPower: user.pet.totalPower,
            health: user.pet.health,
            agility: user.pet.agility,
            intelligence: user.pet.intelligence,
          }
        : null,
      spaceship: user.spaceship
        ? {
            name: user.spaceship.name,
            type: user.spaceship.type,
            level: user.spaceship.level,
            totalPower: user.spaceship.totalPower,
            engine: user.spaceship.engine,
            fuel: user.spaceship.fuel,
            reinforcement: user.spaceship.reinforcement,
          }
        : null,
    };
  }

  /**
   * Update user experience and level
   */
  async updateExperience(
    userId: string,
    experienceGained: number,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.experience = Number(user.experience) + experienceGained;

    // Calculate new level (every 1000 XP = 1 level)
    const newLevel = Math.floor(Number(user.experience) / 1000) + 1;

    if (newLevel > user.level) {
      user.level = newLevel;
    }

    return await this.userRepository.save(user);
  }

  /**
   * Update user stats after exploration
   */
  async updateExplorationStats(
    userId: string,
    isSuccess: boolean,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.totalExplorations += 1;
    if (isSuccess) {
      user.successfulExplorations += 1;
    }

    return await this.userRepository.save(user);
  }

  /**
   * Update user's staking amount
   */
  async updateStakingAmount(userId: string, amount: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.totalStaked = Number(user.totalStaked) + amount;
    user.lastLoginAt = new Date();

    return await this.userRepository.save(user);
  }

  /**
   * Get top users for leaderboard preview
   */
  async getTopUsers(limit: number = 10): Promise<User[]> {
    return await this.userRepository.find({
      where: { isActive: true },
      order: { totalExplorations: 'DESC', successfulExplorations: 'DESC' },
      take: limit,
      relations: ['pet', 'spaceship'],
    });
  }
}
