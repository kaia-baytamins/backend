import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';

import {
  Quest,
  UserQuest,
  User,
  QuestType,
  QuestCategory,
  QuestStatus,
} from '../entities';
import { ContractService } from '../blockchain/contract.service';
import { UsersService } from '../users/users.service';
import { GetQuestsDto } from './dto/quest.dto';

@Injectable()
export class QuestsService {
  private readonly logger = new Logger(QuestsService.name);

  constructor(
    @InjectRepository(Quest)
    private readonly questRepository: Repository<Quest>,
    @InjectRepository(UserQuest)
    private readonly userQuestRepository: Repository<UserQuest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly contractService: ContractService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get available quests for user
   */
  async getAvailableQuests(
    userId: string,
    filters: GetQuestsDto,
  ): Promise<Quest[]> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const queryBuilder = this.questRepository
      .createQueryBuilder('quest')
      .where('quest.isActive = :isActive', { isActive: true })
      .andWhere('quest.levelRequirement <= :userLevel', {
        userLevel: user.level,
      });

    if (filters.type) {
      queryBuilder.andWhere('quest.type = :type', { type: filters.type });
    }

    if (filters.category) {
      queryBuilder.andWhere('quest.category = :category', {
        category: filters.category,
      });
    }

    // Check date constraints
    const now = new Date();
    queryBuilder.andWhere(
      '(quest.startDate IS NULL OR quest.startDate <= :now)',
      { now },
    );
    queryBuilder.andWhere('(quest.endDate IS NULL OR quest.endDate >= :now)', {
      now,
    });

    queryBuilder
      .orderBy('quest.sortOrder', 'ASC')
      .addOrderBy('quest.createdAt', 'DESC')
      .take(filters.limit);

    return await queryBuilder.getMany();
  }

  /**
   * Get user's quest progress
   */
  async getUserQuestProgress(userId: string): Promise<UserQuest[]> {
    return await this.userQuestRepository.find({
      where: { userId, status: QuestStatus.IN_PROGRESS },
      relations: ['quest'],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Start a quest for user
   */
  async startQuest(userId: string, questId: string): Promise<UserQuest> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const quest = await this.questRepository.findOne({
      where: { id: questId },
    });
    if (!quest) {
      throw new NotFoundException('Quest not found');
    }

    if (!quest.isAvailable) {
      throw new BadRequestException('Quest is not available');
    }

    if (quest.levelRequirement > user.level) {
      throw new BadRequestException('User level too low for this quest');
    }

    // Check if user already has this quest
    const existingUserQuest = await this.userQuestRepository.findOne({
      where: { userId, questId },
    });

    if (existingUserQuest && !quest.isRepeatable) {
      throw new BadRequestException('Quest already completed or in progress');
    }

    // Create new user quest
    const userQuest = this.userQuestRepository.create({
      userId,
      questId,
      status: QuestStatus.IN_PROGRESS,
      startedAt: new Date(),
      targetAmount: this.getQuestTargetAmount(quest),
      progress: 0,
    });

    await this.userQuestRepository.save(userQuest);

    // Start tracking quest progress based on blockchain data
    await this.startQuestTracking(userQuest, quest);

    return userQuest;
  }

  /**
   * Claim quest rewards
   */
  async claimQuestReward(
    userId: string,
    questId: string,
  ): Promise<{
    success: boolean;
    rewards: any;
  }> {
    const userQuest = await this.userQuestRepository.findOne({
      where: { userId, questId, status: QuestStatus.COMPLETED },
      relations: ['quest'],
    });

    if (!userQuest) {
      throw new NotFoundException('Completed quest not found');
    }

    try {
      // Update quest status
      userQuest.status = QuestStatus.CLAIMED;
      userQuest.claimedAt = new Date();
      await this.userQuestRepository.save(userQuest);

      // Apply rewards
      const rewards = await this.applyQuestRewards(userId, userQuest.quest);

      this.logger.log(`Quest ${questId} rewards claimed by user ${userId}`);

      return {
        success: true,
        rewards,
      };
    } catch (error) {
      this.logger.error(`Error claiming quest rewards: ${error.message}`);
      throw new BadRequestException('Failed to claim rewards');
    }
  }

  /**
   * Update quest progress based on blockchain events
   */
  @Cron('*/5 * * * *') // Every 5 minutes
  async updateQuestProgress(): Promise<void> {
    this.logger.log('Updating quest progress from blockchain data...');

    try {
      const activeQuests = await this.userQuestRepository.find({
        where: { status: QuestStatus.IN_PROGRESS },
        relations: ['quest', 'user'],
      });

      for (const userQuest of activeQuests) {
        await this.updateSingleQuestProgress(userQuest);
      }

      this.logger.log('Quest progress update completed');
    } catch (error) {
      this.logger.error('Error updating quest progress:', error);
    }
  }

  /**
   * Update single quest progress
   */
  private async updateSingleQuestProgress(userQuest: UserQuest): Promise<void> {
    const { quest, user } = userQuest;

    try {
      let newProgress = 0;

      switch (quest.category) {
        case QuestCategory.STAKING:
          newProgress = await this.getStakingProgress(
            user.walletAddress,
            quest,
          );
          break;
        case QuestCategory.EXPLORATION:
          newProgress = this.getExplorationProgress(user, quest);
          break;
        case QuestCategory.PET_CARE:
          newProgress = await this.getPetCareProgress(user, quest);
          break;
        case QuestCategory.TRADING:
          newProgress = await this.getTradingProgress(user, quest);
          break;
        default:
          return;
      }

      if (newProgress !== userQuest.progress) {
        userQuest.updateProgress(newProgress - userQuest.progress);
        await this.userQuestRepository.save(userQuest);
      }
    } catch (error) {
      this.logger.error(
        `Error updating quest ${userQuest.questId} for user ${userQuest.userId}:`,
        error,
      );
    }
  }

  /**
   * Get staking progress from blockchain
   */
  private async getStakingProgress(
    walletAddress: string,
    quest: Quest,
  ): Promise<number> {
    try {
      const stakedAmount =
        await this.contractService.getStakedAmount(walletAddress);
      const stakedValue = parseFloat(stakedAmount);

      switch (quest.requirements.action) {
        case 'stake':
          return Math.floor(stakedValue);
        case 'maintain_stake':
          // Check if staking duration requirement is met
          // This would require tracking stake timestamps
          return stakedValue >= quest.requirements.amount ? 1 : 0;
        default:
          return 0;
      }
    } catch (error) {
      this.logger.error(`Error getting staking progress: ${error.message}`);
      return 0;
    }
  }

  /**
   * Get exploration progress
   */
  private getExplorationProgress(user: User, quest: Quest): number {
    switch (quest.requirements.action) {
      case 'complete_explorations':
        return user.totalExplorations;
      case 'successful_explorations':
        return user.successfulExplorations;
      default:
        return 0;
    }
  }

  /**
   * Get pet care progress
   */
  private async getPetCareProgress(user: User, quest: Quest): Promise<number> {
    // This would track pet care activities like feeding, training
    // For now, return simple metrics
    switch (quest.requirements.action) {
      case 'feed_pet':
        return user.pet?.trainingCount || 0;
      case 'train_pet':
        return user.pet?.level || 0;
      default:
        return 0;
    }
  }

  /**
   * Get trading progress
   */
  private async getTradingProgress(
    _user: User,
    _quest: Quest,
  ): Promise<number> {
    // This would track marketplace activities
    // For now, return placeholder
    return 0;
  }

  /**
   * Start quest tracking
   */
  private async startQuestTracking(
    userQuest: UserQuest,
    quest: Quest,
  ): Promise<void> {
    // Initialize quest-specific tracking
    switch (quest.category) {
      case QuestCategory.STAKING:
        // Track staking events for this user
        break;
      case QuestCategory.EXPLORATION:
        // Track exploration completions
        break;
      default:
        break;
    }
  }

  /**
   * Get quest target amount
   */
  private getQuestTargetAmount(quest: Quest): number {
    return quest.requirements.amount || 1;
  }

  /**
   * Apply quest rewards to user
   */
  private async applyQuestRewards(userId: string, quest: Quest): Promise<any> {
    const rewards = quest.rewards;
    const appliedRewards: any = {};

    try {
      // Apply KAIA rewards
      if (rewards.kaiaAmount) {
        // In a real implementation, this would transfer KAIA tokens
        appliedRewards.kaia = rewards.kaiaAmount;
      }

      // Apply experience rewards
      if (rewards.experience) {
        await this.usersService.updateExperience(userId, rewards.experience);
        appliedRewards.experience = rewards.experience;
      }

      // Apply NFT rewards
      if (rewards.nftTokenId) {
        // Mint or transfer NFT to user
        appliedRewards.nft = rewards.nftTokenId;
      }

      // Apply item rewards
      if (rewards.items) {
        // Add items to user's inventory
        appliedRewards.items = rewards.items;
      }

      return appliedRewards;
    } catch (error) {
      this.logger.error(`Error applying rewards: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get quest completion statistics
   */
  async getQuestStats(userId: string): Promise<{
    totalQuestsCompleted: number;
    dailyQuestsCompleted: number;
    weeklyQuestsCompleted: number;
    totalRewardsEarned: {
      kaia: number;
      experience: number;
      nfts: number;
    };
  }> {
    const completed = await this.userQuestRepository.find({
      where: { userId, status: QuestStatus.CLAIMED },
      relations: ['quest'],
    });

    const daily = completed.filter((uq) => uq.quest.type === QuestType.DAILY);
    const weekly = completed.filter((uq) => uq.quest.type === QuestType.WEEKLY);

    const totalRewards = completed.reduce(
      (acc, uq) => {
        const rewards = uq.quest.rewards;
        acc.kaia += rewards.kaiaAmount || 0;
        acc.experience += rewards.experience || 0;
        acc.nfts += rewards.nftTokenId ? 1 : 0;
        return acc;
      },
      { kaia: 0, experience: 0, nfts: 0 },
    );

    return {
      totalQuestsCompleted: completed.length,
      dailyQuestsCompleted: daily.length,
      weeklyQuestsCompleted: weekly.length,
      totalRewardsEarned: totalRewards,
    };
  }
}
