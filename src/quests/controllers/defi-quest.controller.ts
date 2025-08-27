import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
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
    const portfolioData = await this.defiService.getUserPortfolio(
      user.walletAddress,
    );
    const participation = await this.questsService.getUserDefiParticipation(
      user.id,
    );

    // Transform the portfolio data to match frontend expectations
    const portfolio = {
      totalValue: portfolioData.totalValue,
      stakingValue: portfolioData.staking.amount,
      lendingValue: portfolioData.lending.supplied,
      lpValue: portfolioData.amm.liquidityProvided,
    };

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
   * Prepare DeFi quest transaction for user signing
   */
  @Post('prepare-transaction')
  @HttpCode(HttpStatus.OK)
  async prepareDefiQuestTransaction(
    @CurrentUser() user: User,
    @Body() participationDto: DefiQuestParticipationDto,
  ) {
    const { questType, amount } = participationDto;

    try {
      let transactionData;

      switch (questType) {
        case 'staking':
          transactionData = await this.defiService.prepareStakeTransaction(
            user.walletAddress,
            amount,
          );
          break;

        case 'lending':
          transactionData =
            await this.defiService.prepareLendingSupplyTransaction(
              user.walletAddress,
              amount,
            );
          break;

        case 'lp_providing':
          // For LP, we assume equal amounts of token A and B
          const halfAmount = (parseFloat(amount) / 2).toString();
          transactionData =
            await this.defiService.prepareAmmLiquidityTransaction(
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
        transactionData,
        message: `Transaction prepared for ${questType} quest. Please sign and submit to /blockchain/gas-delegation/delegate`,
        instructions: {
          step1: 'Sign the transaction message with your wallet',
          step2:
            'Submit the signed transaction to /blockchain/gas-delegation/delegate endpoint',
          step3: 'Gas fees will be covered by our delegation service',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: `Failed to prepare transaction for ${questType} quest`,
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
   * Check if approval is needed for staking
   */
  @Post('check-staking-approval')
  @HttpCode(HttpStatus.OK)
  async checkStakingApproval(
    @CurrentUser() user: User,
    @Body() { amount }: { amount: string },
  ) {
    try {
      const result = await this.defiService.checkStakingApprovalNeeded(
        user.walletAddress,
        amount,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        needsApproval: true,
        currentAllowance: '0',
        requiredAmount: amount,
      };
    }
  }

  /**
   * Check if approval is needed for lending supply
   */
  @Post('check-lending-approval')
  @HttpCode(HttpStatus.OK)
  async checkLendingApproval(
    @CurrentUser() user: User,
    @Body() { amount }: { amount: string },
  ) {
    try {
      const result = await this.defiService.checkLendingApprovalNeeded(
        user.walletAddress,
        amount,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        needsApproval: true,
        currentAllowance: '0',
        requiredAmount: amount,
      };
    }
  }

  /**
   * Prepare faucet transaction for user signing
   */
  @Post('prepare-faucet')
  @HttpCode(HttpStatus.OK)
  async prepareFaucetTransaction(@CurrentUser() user: User) {
    try {
      const transactionData = await this.defiService.prepareFaucetTransaction(
        user.walletAddress,
      );

      return {
        success: true,
        transactionData,
        message:
          'Faucet transaction prepared. Please sign and submit to /blockchain/gas-delegation/delegate',
        instructions: {
          step1: 'Sign this transaction with your wallet',
          step2:
            'Submit the signed transaction to /blockchain/gas-delegation/delegate endpoint',
          step3: 'Gas fees will be covered by our delegation service',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        message: 'Failed to prepare faucet transaction',
      };
    }
  }
}
