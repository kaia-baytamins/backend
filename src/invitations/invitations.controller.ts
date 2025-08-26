import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import { InvitationsService } from './invitations.service';
import { AcceptInvitationDto } from './dto/invitation.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Public()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Accept invitation',
    description:
      'Accept an invitation and create friendship using LINE user IDs',
  })
  @ApiBody({ type: AcceptInvitationDto })
  @ApiResponse({
    status: 200,
    description: 'Invitation accepted successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        newUserCreated: { type: 'boolean', example: true },
        friendshipCreated: { type: 'boolean', example: true },
        inviter: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            username: { type: 'string', example: 'John Doe' },
            lineUserId: { type: 'string', example: 'U123...' },
          },
        },
        invitee: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            username: { type: 'string', example: 'Jane Doe' },
            lineUserId: { type: 'string', example: 'U456...' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Inviter not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot invite yourself or already friends',
  })
  async acceptInvitation(@Body() acceptInvitationDto: AcceptInvitationDto) {
    return await this.invitationsService.acceptInvitation(acceptInvitationDto);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get invitation statistics',
    description: 'Get invitation statistics for current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      properties: {
        totalInvitationsSent: { type: 'number', example: 5 },
        successfulInvitationsCount: { type: 'number', example: 3 },
      },
    },
  })
  async getInvitationStats(@CurrentUser() user: User) {
    return await this.invitationsService.getInvitationStats(user.id);
  }
}
