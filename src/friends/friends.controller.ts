import {
  Controller,
  Get,
  Delete,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { FriendsService } from './friends.service';
import { RemoveFriendDto } from './dto/friend.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';

@ApiTags('Friends')
@Controller('friends')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get friends list',
    description: 'Get list of user friends',
  })
  @ApiResponse({
    status: 200,
    description: 'Friends list retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', example: 'uuid-string' },
          username: { type: 'string', example: 'John Doe' },
          lineUserId: { type: 'string', example: 'U123...' },
          level: { type: 'number', example: 5 },
          experience: { type: 'number', example: 1250 },
          lastLoginAt: {
            type: 'string',
            format: 'date-time',
            example: '2024-01-01T12:00:00Z',
          },
        },
      },
    },
  })
  async getFriends(@CurrentUser() user: User) {
    return await this.friendsService.getFriends(user.id);
  }

  @Delete('remove')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove friend',
    description: 'Remove a friend from user friend list (bidirectional)',
  })
  @ApiBody({ type: RemoveFriendDto })
  @ApiResponse({
    status: 200,
    description: 'Friend removed successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Friend removed successfully' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Friend or friendship not found' })
  async removeFriend(
    @CurrentUser() user: User,
    @Body() removeFriendDto: RemoveFriendDto,
  ) {
    return await this.friendsService.removeFriend(user.id, removeFriendDto);
  }

  @Get('count')
  @ApiOperation({
    summary: 'Get friends count',
    description: 'Get total number of friends for current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Friends count retrieved successfully',
    schema: {
      properties: {
        friendsCount: { type: 'number', example: 12 },
      },
    },
  })
  async getFriendsCount(@CurrentUser() user: User) {
    const friendsCount = await this.friendsService.getFriendsCount(user.id);
    return { friendsCount };
  }
}
