import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiSecurity,
} from '@nestjs/swagger';

import { LeaderboardService } from './leaderboard.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { LeaderboardType, LeaderboardPeriod } from '../entities';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Leaderboard')
@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get leaderboard rankings',
    description: 'Retrieve leaderboard rankings by type and period',
  })
  @ApiQuery({
    name: 'type',
    enum: LeaderboardType,
    description: 'Leaderboard type',
    required: false,
  })
  @ApiQuery({
    name: 'period',
    enum: LeaderboardPeriod,
    description: 'Time period',
    required: false,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    description: 'Number of results to return',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'Leaderboard retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          rank: { type: 'number', example: 1 },
          score: { type: 'number', example: 150 },
          previousRank: { type: 'number', example: 2 },
          rankChange: { type: 'number', example: 1 },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string', example: 'SpaceExplorer' },
              walletAddress: { type: 'string' },
              level: { type: 'number', example: 5 },
            },
          },
          metadata: {
            type: 'object',
            properties: {
              petName: { type: 'string', example: 'Cosmic Dog' },
              petType: { type: 'string', example: 'dog' },
              spaceshipName: { type: 'string', example: 'Star Voyager' },
            },
          },
        },
      },
    },
  })
  async getLeaderboard(
    @Query('type') type: LeaderboardType = LeaderboardType.TOTAL_EXPLORATIONS,
    @Query('period') period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
  ) {
    return await this.leaderboardService.getLeaderboard(type, period, limit);
  }

  @Get('my-rankings')
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'Get current user rankings',
    description:
      "Retrieve the authenticated user's position across all leaderboards",
  })
  @ApiResponse({
    status: 200,
    description: 'User rankings retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          type: { type: 'string', example: 'total_explorations' },
          period: { type: 'string', example: 'all_time' },
          rank: { type: 'number', example: 15 },
          score: { type: 'number', example: 42 },
          previousRank: { type: 'number', example: 18 },
          rankChange: { type: 'number', example: 3 },
          rankChangeIndicator: { type: 'string', example: 'up' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMyRankings(@CurrentUser() user: User) {
    return await this.leaderboardService.getUserAllRankings(user.id);
  }

  @Get('my-rank')
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'Get user rank in specific leaderboard',
    description: "Get the authenticated user's rank in a specific leaderboard",
  })
  @ApiQuery({
    name: 'type',
    enum: LeaderboardType,
    description: 'Leaderboard type',
    required: true,
  })
  @ApiQuery({
    name: 'period',
    enum: LeaderboardPeriod,
    description: 'Time period',
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: 'User rank retrieved successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found in leaderboard' })
  async getMyRank(
    @CurrentUser() user: User,
    @Query('type') type: LeaderboardType,
    @Query('period') period: LeaderboardPeriod = LeaderboardPeriod.ALL_TIME,
  ) {
    const rank = await this.leaderboardService.getUserRank(
      user.id,
      type,
      period,
    );
    if (!rank) {
      return { message: 'User not found in this leaderboard', rank: null };
    }
    return rank;
  }

  @Public()
  @Get('top-performers')
  @ApiOperation({
    summary: 'Get top performers summary',
    description: 'Get a summary of top performers across different categories',
  })
  @ApiResponse({
    status: 200,
    description: 'Top performers summary retrieved successfully',
    schema: {
      properties: {
        topExplorer: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                username: { type: 'string', example: 'SpaceExplorer' },
                totalExplorations: { type: 'number', example: 150 },
              },
            },
            pet: {
              type: 'object',
              properties: {
                petName: { type: 'string', example: 'Cosmic Dog' },
                petType: { type: 'string', example: 'dog' },
              },
            },
          },
        },
        topStaker: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                username: { type: 'string', example: 'DeFiMaster' },
                totalStaked: { type: 'number', example: 10000 },
              },
            },
          },
        },
        topPower: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                username: { type: 'string', example: 'PowerUser' },
                totalPower: { type: 'number', example: 850 },
              },
            },
            metadata: {
              type: 'object',
              properties: {
                petName: { type: 'string', example: 'Thunder Cat' },
                petType: { type: 'string', example: 'cat' },
                spaceshipName: { type: 'string', example: 'Quantum Ship' },
              },
            },
          },
        },
      },
    },
  })
  async getTopPerformers() {
    return await this.leaderboardService.getTopPerformersSummary();
  }

  @Public()
  @Get('rankings')
  @ApiOperation({
    summary: 'Get top 5 rankings for specific categories',
    description:
      'Get top 5 users for total explorations and successful explorations (NFT count)',
  })
  @ApiResponse({
    status: 200,
    description: 'Rankings retrieved successfully',
    schema: {
      properties: {
        totalExplorations: {
          type: 'array',
          items: {
            properties: {
              rank: { type: 'number', example: 1 },
              username: { type: 'string', example: 'SpaceExplorer' },
              score: { type: 'number', example: 150 },
            },
          },
        },
        successfulExplorations: {
          type: 'array',
          items: {
            properties: {
              rank: { type: 'number', example: 1 },
              username: { type: 'string', example: 'NFTCollector' },
              score: { type: 'number', example: 42 },
            },
          },
        },
      },
    },
  })
  async getRankings() {
    return await this.leaderboardService.getTop5Rankings();
  }
}
