import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../entities';
import { QuestsService } from '../quests.service';
import { DefiService } from '../../blockchain/defi.service';

interface DefiQuestParticipationDto {
  questType: 'staking' | 'lending' | 'lp_providing';
  amount: string;
  duration?: number; // in hours
}

@Controller('quests/defi')
@UseGuards(JwtAuthGuard)
export class DefiQuestController {
  constructor(
    private readonly questsService: QuestsService,
    private readonly defiService: DefiService,
  ) {}

  /**
   * Get user's DeFi portfolio for quest tracking
   */
  @Get('portfolio')
  async getUserDefiPortfolio(@CurrentUser() user: User) {
    const portfolio = await this.defiService.getUserPortfolio(
      user.walletAddress,
    );
    const participation = await this.questsService.getUserDefiParticipation(
      user.id,
    );

    return {
      portfolio,
      questEligibility: {
        totalValue: participation.totalValue,
        stakingValue: participation.stakingValue,
        lendingValue: participation.lendingValue,
        lpValue: participation.lpValue,
      },
    };
  }

  /**
   * Get DeFi-specific quests
   */
  @Get('available')
  async getDefiQuests(@CurrentUser() user: User) {
    const allQuests = await this.questsService.getAvailableQuests(user.id, {
      limit: 50,
    });

    // Filter for DeFi-related quests
    const defiQuests = allQuests.filter((quest) =>
      ['staking', 'lending', 'lp_providing', 'trading'].includes(
        quest.category,
      ),
    );

    return defiQuests;
  }

  /**
   * Participate in DeFi quest (simulate DeFi interaction)
   */
  @Post('participate')
  @HttpCode(HttpStatus.OK)
  async participateInDefiQuest(
    @CurrentUser() user: User,
    @Body() participationDto: DefiQuestParticipationDto,
  ) {
    const { questType, amount } = participationDto;

    try {
      let transactionHash: string;

      switch (questType) {
        case 'staking':
          transactionHash = await this.defiService.stakeTokens(
            user.walletAddress,
            amount,
          );
          break;

        case 'lending':
          transactionHash = await this.defiService.supplyToLending(
            user.walletAddress,
            amount,
          );
          break;

        case 'lp_providing':
          // For LP, we assume equal amounts of token A and B
          const halfAmount = (parseFloat(amount) / 2).toString();
          transactionHash = await this.defiService.addLiquidityToAmm(
            user.walletAddress,
            halfAmount,
            halfAmount,
          );
          break;

        default:
          throw new Error(`Unsupported quest type: ${questType}`);
      }

      return {
        success: true,
        transactionHash,
        message: `Successfully participated in ${questType} quest`,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to participate in ${questType} quest`,
      };
    }
  }

  /**
   * Get quest progress for DeFi activities
   */
  @Get('progress')
  async getDefiQuestProgress(@CurrentUser() user: User) {
    const userQuests = await this.questsService.getUserQuestProgress(user.id);

    // Filter for DeFi-related quest progress
    const defiQuestProgress = userQuests.filter((userQuest) =>
      ['staking', 'lending', 'lp_providing', 'trading'].includes(
        userQuest.quest.category,
      ),
    );

    return defiQuestProgress.map((userQuest) => ({
      questId: userQuest.questId,
      title: userQuest.quest.title,
      category: userQuest.quest.category,
      progress: userQuest.progress,
      targetAmount: userQuest.targetAmount,
      status: userQuest.status,
      progressPercentage: Math.min(
        100,
        (userQuest.progress / userQuest.targetAmount) * 100,
      ),
    }));
  }

  /**
   * Claim DeFi quest rewards
   */
  @Post(':questId/claim')
  @HttpCode(HttpStatus.OK)
  async claimDefiQuestReward(
    @CurrentUser() user: User,
    @Param('questId') questId: string,
  ) {
    try {
      const result = await this.questsService.claimQuestReward(
        user.id,
        questId,
      );
      return {
        success: result.success,
        rewards: result.rewards,
        message: 'Quest rewards claimed successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to claim quest rewards',
      };
    }
  }

  /**
   * Get DeFi platform statistics for quest context
   */
  @Get('stats')
  async getDefiStats() {
    const stats = await this.defiService.getDefiStats();
    return {
      platform: stats,
      questMultipliers: {
        stakingBoost: 1.2, // 20% bonus during events
        lendingBoost: 1.1, // 10% bonus
        lpBoost: 1.5, // 50% bonus for LP providers
      },
    };
  }

  /**
   * Request faucet tokens for testing
   */
  @Post('faucet')
  @HttpCode(HttpStatus.OK)
  async requestFaucetTokens(@CurrentUser() user: User) {
    try {
      const transactionHash = await this.defiService.requestFaucetTokens(
        user.walletAddress,
      );

      return {
        success: true,
        transactionHash,
        message: 'Faucet tokens requested successfully',
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to request faucet tokens',
      };
    }
  }
}
