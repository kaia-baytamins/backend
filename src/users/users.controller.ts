import { Controller, Get, Put, Body, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';

import { UsersService } from './users.service';
import { UpdateUserProfileDto } from './dto/user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Users')
@Controller('users')
@ApiSecurity('LineUserID')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Retrieve the authenticated user's complete profile including pet and spaceship data",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
    schema: {
      properties: {
        id: { type: 'string', example: 'uuid-string' },
        walletAddress: {
          type: 'string',
          example: '0x742C4f7C8e4C4e6f7A4a4a4a4a4a4a4a4a4a4a4a',
        },
        username: { type: 'string', example: 'SpaceExplorer' },
        level: { type: 'number', example: 1 },
        experience: { type: 'number', example: 0 },
        totalExplorations: { type: 'number', example: 0 },
        successfulExplorations: { type: 'number', example: 0 },
        totalStaked: { type: 'number', example: 0 },
        pet: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Dog Companion' },
            type: { type: 'string', example: 'dog' },
            level: { type: 'number', example: 1 },
            health: { type: 'number', example: 100 },
            agility: { type: 'number', example: 50 },
            intelligence: { type: 'number', example: 50 },
          },
        },
        spaceship: {
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Explorer I' },
            type: { type: 'string', example: 'basic' },
            level: { type: 'number', example: 1 },
            engine: { type: 'number', example: 100 },
            fuel: { type: 'number', example: 100 },
            reinforcement: { type: 'number', example: 50 },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUser() user: User) {
    return await this.usersService.getUserProfile(user.id);
  }

  @Get('profile/line-id/:lineUserId')
  @ApiOperation({
    summary: 'Get user profile by Line ID',
    description: "Retrieve the user's profile using their Line ID",
  })
  @ApiResponse({
    status: 200,
    description: 'User profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfileByLineId(@Param('lineUserId') lineUserId: string) {
    return await this.usersService.getUserProfileByLineId(lineUserId);
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update user profile',
    description: "Update the authenticated user's profile information",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - username already taken',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateData: UpdateUserProfileDto,
  ) {
    return await this.usersService.updateProfile(user.id, updateData);
  }

  @Put('wallet-address')
  @ApiOperation({
    summary: 'Update user wallet address',
    description: "Update the authenticated user's wallet address",
  })
  @ApiResponse({
    status: 200,
    description: 'Wallet address updated successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Wallet address updated successfully',
        },
        walletAddress: {
          type: 'string',
          example: '0x742C4f7C8e4C4e6f7A4a4a4a4a4a4a4a4a4a4a4a',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid wallet address format' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateWalletAddress(
    @CurrentUser() user: User,
    @Body() updateData: { walletAddress: string },
  ) {
    const result = await this.usersService.updateWalletAddress(
      user.id,
      updateData.walletAddress,
    );
    return {
      success: true,
      message: 'Wallet address updated successfully',
      walletAddress: result.walletAddress,
    };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get user statistics',
    description: 'Retrieve detailed statistics for the authenticated user',
  })
  @ApiResponse({
    status: 200,
    description: 'User statistics retrieved successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        walletAddress: { type: 'string' },
        username: { type: 'string' },
        level: { type: 'number' },
        experience: { type: 'number' },
        totalExplorations: { type: 'number' },
        successfulExplorations: { type: 'number' },
        totalStaked: { type: 'number' },
        successRate: { type: 'number', description: 'Success rate percentage' },
        pet: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            level: { type: 'number' },
            totalPower: { type: 'number' },
            health: { type: 'number' },
            agility: { type: 'number' },
            intelligence: { type: 'number' },
          },
        },
        spaceship: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            type: { type: 'string' },
            level: { type: 'number' },
            totalPower: { type: 'number' },
            engine: { type: 'number' },
            fuel: { type: 'number' },
            reinforcement: { type: 'number' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getStats(@CurrentUser() user: User) {
    return await this.usersService.getUserStats(user.id);
  }
}
