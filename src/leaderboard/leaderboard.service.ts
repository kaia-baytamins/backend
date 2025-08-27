import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import {
  Leaderboard,
  LeaderboardType,
  LeaderboardPeriod,
  User,
  Pet,
  Spaceship,
} from '../entities';

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    @InjectRepository(Leaderboard)
    private readonly leaderboardRepository: Repository<Leaderboard>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Pet)
    private readonly petRepository: Repository<Pet>,
    @InjectRepository(Spaceship)
    private readonly spaceshipRepository: Repository<Spaceship>,
  ) {}

  /**
   * Get leaderboard by type and period
   */
  async getLeaderboard(
    type: LeaderboardType,
    period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
    limit: number = 100,
  ): Promise<Leaderboard[]> {
    return await this.leaderboardRepository.find({
      where: { type, period, isActive: true },
      relations: ['user', 'user.pet', 'user.spaceship'],
      order: { rank: 'ASC' },
      take: limit,
    });
  }

  /**
   * Get user's rank in specific leaderboard
   */
  async getUserRank(
    userId: string,
    type: LeaderboardType,
    period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
  ): Promise<Leaderboard | null> {
    return await this.leaderboardRepository.findOne({
      where: { userId, type, period, isActive: true },
      relations: ['user'],
    });
  }

  /**
   * Update leaderboard rankings (called periodically)
   */
  @Cron('0 */6 * * *') // Every 6 hours
  async updateAllLeaderboards(): Promise<void> {
    this.logger.log('Starting leaderboard update...');

    try {
      await Promise.all([
        this.updateExplorationLeaderboards(),
        this.updateStakingLeaderboards(),
        this.updatePowerLeaderboards(),
        this.updateLevelLeaderboards(),
      ]);

      this.logger.log('Leaderboard update completed successfully');
    } catch (error) {
      this.logger.error('Error updating leaderboards:', error);
    }
  }

  /**
   * Update exploration-based leaderboards
   */
  private async updateExplorationLeaderboards(): Promise<void> {
    // Total explorations leaderboard
    const totalExplorationUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.totalExplorations > 0')
      .orderBy('user.totalExplorations', 'DESC')
      .addOrderBy('user.successfulExplorations', 'DESC')
      .addOrderBy('user.createdAt', 'ASC')
      .getMany();

    await this.updateLeaderboardType(
      LeaderboardType.TOTAL_EXPLORATIONS,
      totalExplorationUsers,
      (user) => user.totalExplorations,
    );

    // Successful explorations leaderboard
    const successfulExplorationUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.successfulExplorations > 0')
      .orderBy('user.successfulExplorations', 'DESC')
      .addOrderBy('user.totalExplorations', 'DESC')
      .addOrderBy('user.createdAt', 'ASC')
      .getMany();

    await this.updateLeaderboardType(
      LeaderboardType.SUCCESSFUL_EXPLORATIONS,
      successfulExplorationUsers,
      (user) => user.successfulExplorations,
    );
  }

  /**
   * Update staking leaderboards
   */
  private async updateStakingLeaderboards(): Promise<void> {
    const stakingUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('user.totalStaked > 0')
      .orderBy('user.totalStaked', 'DESC')
      .addOrderBy('user.createdAt', 'ASC')
      .getMany();

    await this.updateLeaderboardType(
      LeaderboardType.TOTAL_STAKED,
      stakingUsers,
      (user) => Number(user.totalStaked),
    );
  }

  /**
   * Update power-based leaderboards
   */
  private async updatePowerLeaderboards(): Promise<void> {
    // Pet power leaderboard
    const petPowerUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.pet', 'pet')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('pet.id IS NOT NULL')
      .orderBy('(pet.health + pet.agility + pet.intelligence)', 'DESC')
      .addOrderBy('user.createdAt', 'ASC')
      .getMany();

    await this.updateLeaderboardType(
      LeaderboardType.PET_POWER,
      petPowerUsers,
      (user) => (user.pet ? user.pet.totalPower : 0),
      (user) => ({
        petName: user.pet?.name,
        petType: user.pet?.type,
      }),
    );

    // Spaceship power leaderboard
    const spaceshipPowerUsers = await this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.spaceship', 'spaceship')
      .leftJoinAndSelect('spaceship.items', 'items')
      .where('user.isActive = :isActive', { isActive: true })
      .andWhere('spaceship.id IS NOT NULL')
      .orderBy(
        '(spaceship.engine + spaceship.fuel + spaceship.reinforcement)',
        'DESC',
      )
      .addOrderBy('user.createdAt', 'ASC')
      .getMany();

    await this.updateLeaderboardType(
      LeaderboardType.SPACESHIP_POWER,
      spaceshipPowerUsers,
      (user) => (user.spaceship ? user.spaceship.totalPower : 0),
      (user) => ({
        spaceshipName: user.spaceship?.name,
      }),
    );

    // Total power leaderboard
    await this.updateLeaderboardType(
      LeaderboardType.TOTAL_POWER,
      spaceshipPowerUsers.filter((user) => user.pet && user.spaceship),
      (user) => {
        const petPower = user.pet ? user.pet.totalPower : 0;
        const spaceshipPower = user.spaceship ? user.spaceship.totalPower : 0;
        return petPower + spaceshipPower;
      },
      (user) => ({
        petName: user.pet?.name,
        petType: user.pet?.type,
        spaceshipName: user.spaceship?.name,
      }),
    );
  }

  /**
   * Update level leaderboards
   */
  private async updateLevelLeaderboards(): Promise<void> {
    const levelUsers = await this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :isActive', { isActive: true })
      .orderBy('user.level', 'DESC')
      .addOrderBy('user.experience', 'DESC')
      .addOrderBy('user.createdAt', 'ASC')
      .getMany();

    await this.updateLeaderboardType(
      LeaderboardType.USER_LEVEL,
      levelUsers,
      (user) => user.level,
    );
  }

  /**
   * Update specific leaderboard type
   */
  private async updateLeaderboardType(
    type: LeaderboardType,
    users: User[],
    scoreFunction: (user: User) => number,
    metadataFunction?: (user: User) => Record<string, any>,
  ): Promise<void> {
    const period = LeaderboardPeriod.ALL_TIME;

    // Get existing leaderboard entries
    const existingEntries = await this.leaderboardRepository.find({
      where: { type, period },
    });

    const existingMap = new Map(
      existingEntries.map((entry) => [entry.userId, entry]),
    );

    const updatedEntries: Leaderboard[] = [];

    users.forEach((user, index) => {
      const rank = index + 1;
      const score = scoreFunction(user);
      const metadata = metadataFunction ? metadataFunction(user) : {};

      const existing = existingMap.get(user.id);

      if (existing) {
        // Update existing entry
        existing.previousRank = existing.rank;
        existing.previousScore = existing.score;
        existing.rank = rank;
        existing.score = score;
        existing.metadata = { ...existing.metadata, ...metadata };
        existing.isActive = true;
        updatedEntries.push(existing);
      } else {
        // Create new entry
        const newEntry = this.leaderboardRepository.create({
          type,
          period,
          rank,
          score,
          metadata,
          userId: user.id,
          isActive: true,
        });
        updatedEntries.push(newEntry);
      }

      existingMap.delete(user.id);
    });

    // Mark remaining entries as inactive
    existingMap.forEach((entry) => {
      entry.isActive = false;
      updatedEntries.push(entry);
    });

    // Save all updates
    await this.leaderboardRepository.save(updatedEntries);
  }

  /**
   * Get user's position across all leaderboards
   */
  async getUserAllRankings(userId: string): Promise<Leaderboard[]> {
    return await this.leaderboardRepository.find({
      where: { userId, isActive: true },
      relations: ['user'],
      order: { type: 'ASC', period: 'ASC' },
    });
  }

  /**
   * Get top performers summary
   */
  async getTopPerformersSummary(): Promise<any> {
    const topExplorer = await this.leaderboardRepository.findOne({
      where: {
        type: LeaderboardType.TOTAL_EXPLORATIONS,
        period: LeaderboardPeriod.ALL_TIME,
        rank: 1,
        isActive: true,
      },
      relations: ['user', 'user.pet'],
    });

    const topStaker = await this.leaderboardRepository.findOne({
      where: {
        type: LeaderboardType.TOTAL_STAKED,
        period: LeaderboardPeriod.ALL_TIME,
        rank: 1,
        isActive: true,
      },
      relations: ['user'],
    });

    const topPower = await this.leaderboardRepository.findOne({
      where: {
        type: LeaderboardType.TOTAL_POWER,
        period: LeaderboardPeriod.ALL_TIME,
        rank: 1,
        isActive: true,
      },
      relations: ['user', 'user.pet', 'user.spaceship'],
    });

    return {
      topExplorer: topExplorer
        ? {
            user: {
              username:
                topExplorer.user.username || topExplorer.user.walletAddress,
              totalExplorations: topExplorer.score,
            },
            pet: topExplorer.metadata,
          }
        : null,
      topStaker: topStaker
        ? {
            user: {
              username: topStaker.user.username || topStaker.user.walletAddress,
              totalStaked: topStaker.score,
            },
          }
        : null,
      topPower: topPower
        ? {
            user: {
              username: topPower.user.username || topPower.user.walletAddress,
              totalPower: topPower.score,
            },
            metadata: topPower.metadata,
          }
        : null,
    };
  }

  /**
   * Get top 5 rankings for main leaderboard categories
   */
  async getTop5Rankings(): Promise<any> {
    // Get top 5 total explorations
    const totalExplorations = await this.leaderboardRepository.find({
      where: {
        type: LeaderboardType.TOTAL_EXPLORATIONS,
        period: LeaderboardPeriod.ALL_TIME,
        isActive: true,
      },
      relations: ['user'],
      order: { rank: 'ASC' },
      take: 5,
    });

    // Get top 5 successful explorations (NFT count)
    const successfulExplorations = await this.leaderboardRepository.find({
      where: {
        type: LeaderboardType.SUCCESSFUL_EXPLORATIONS,
        period: LeaderboardPeriod.ALL_TIME,
        isActive: true,
      },
      relations: ['user'],
      order: { rank: 'ASC' },
      take: 5,
    });

    return {
      totalExplorations: totalExplorations.map((entry) => ({
        rank: entry.rank,
        username: entry.user.username || entry.user.walletAddress || 'Unknown',
        score: Number(entry.score),
      })),
      successfulExplorations: successfulExplorations.map((entry) => ({
        rank: entry.rank,
        username: entry.user.username || entry.user.walletAddress || 'Unknown',
        score: Number(entry.score),
      })),
    };
  }
}
