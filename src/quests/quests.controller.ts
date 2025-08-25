import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
  ApiParam,
} from '@nestjs/swagger';

import { QuestsService } from './quests.service';
import { GetQuestsDto } from './dto/quest.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Quests')
@Controller('quests')
@ApiSecurity('LineUserID')
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get available quests',
    description:
      'Retrieve quests available for the authenticated user based on level and filters',
  })
  @ApiResponse({
    status: 200,
    description: 'Available quests retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string' },
          title: { type: 'string', example: 'First Exploration Ready!' },
          description: {
            type: 'string',
            example: 'Stake $10 to power up your pet and spaceship',
          },
          type: { type: 'string', example: 'daily' },
          category: { type: 'string', example: 'staking' },
          requirements: {
            type: 'object',
            properties: {
              action: { type: 'string', example: 'stake' },
              amount: { type: 'number', example: 10 },
              duration: { type: 'number', example: 24 },
            },
          },
          rewards: {
            type: 'object',
            properties: {
              kaiaAmount: { type: 'number', example: 5 },
              experience: { type: 'number', example: 100 },
              nftTokenId: { type: 'string', example: 'basic-engine-nft' },
            },
          },
          levelRequirement: { type: 'number', example: 1 },
          isAvailable: { type: 'boolean', example: true },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAvailableQuests(
    @CurrentUser() user: User,
    @Query() filters: GetQuestsDto,
  ) {
    return await this.questsService.getAvailableQuests(user.id, filters);
  }

  @Get('progress')
  @ApiOperation({
    summary: 'Get quest progress',
    description: "Retrieve the authenticated user's current quest progress",
  })
  @ApiResponse({
    status: 200,
    description: 'Quest progress retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          questId: { type: 'string' },
          status: { type: 'string', example: 'in_progress' },
          progress: { type: 'number', example: 7 },
          targetAmount: { type: 'number', example: 10 },
          progressPercentage: { type: 'number', example: 70 },
          canClaim: { type: 'boolean', example: false },
          startedAt: { type: 'string', format: 'date-time' },
          quest: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
              type: { type: 'string' },
              category: { type: 'string' },
              rewards: { type: 'object' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getQuestProgress(@CurrentUser() user: User) {
    return await this.questsService.getUserQuestProgress(user.id);
  }

  @Post(':questId/start')
  @ApiOperation({
    summary: 'Start a quest',
    description: 'Start a specific quest for the authenticated user',
  })
  @ApiParam({
    name: 'questId',
    description: 'ID of the quest to start',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 201,
    description: 'Quest started successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        questId: { type: 'string' },
        status: { type: 'string', example: 'in_progress' },
        progress: { type: 'number', example: 0 },
        targetAmount: { type: 'number', example: 10 },
        startedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Quest not available or already started',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Quest not found' })
  async startQuest(
    @CurrentUser() user: User,
    @Param('questId') questId: string,
  ) {
    return await this.questsService.startQuest(user.id, questId);
  }

  @Post(':questId/claim')
  @ApiOperation({
    summary: 'Claim quest rewards',
    description: 'Claim rewards for a completed quest',
  })
  @ApiParam({
    name: 'questId',
    description: 'ID of the quest to claim rewards for',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Quest rewards claimed successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        rewards: {
          type: 'object',
          properties: {
            kaia: { type: 'number', example: 5 },
            experience: { type: 'number', example: 100 },
            nft: { type: 'string', example: 'basic-engine-nft' },
            items: {
              type: 'array',
              items: {
                properties: {
                  type: { type: 'string', example: 'engine' },
                  rarity: { type: 'string', example: 'common' },
                  name: { type: 'string', example: 'Basic Engine V1' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Quest not completed or already claimed',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Quest not found' })
  async claimQuestReward(
    @CurrentUser() user: User,
    @Param('questId') questId: string,
  ) {
    return await this.questsService.claimQuestReward(user.id, questId);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get quest statistics',
    description:
      'Retrieve quest completion statistics for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'Quest statistics retrieved successfully',
    schema: {
      properties: {
        totalQuestsCompleted: { type: 'number', example: 25 },
        dailyQuestsCompleted: { type: 'number', example: 15 },
        weeklyQuestsCompleted: { type: 'number', example: 8 },
        totalRewardsEarned: {
          type: 'object',
          properties: {
            kaia: { type: 'number', example: 125 },
            experience: { type: 'number', example: 2500 },
            nfts: { type: 'number', example: 5 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getQuestStats(@CurrentUser() user: User) {
    return await this.questsService.getQuestStats(user.id);
  }
}
