import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';
import { Friendship, FriendshipStatus } from '../entities/friendship.entity';
import { UserStats } from '../entities/user-stats.entity';
import { AcceptInvitationDto } from './dto/invitation.dto';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
    @InjectRepository(UserStats)
    private readonly userStatsRepository: Repository<UserStats>,
  ) {}

  /**
   * Accept invitation and create friendship - simplified version
   */
  async acceptInvitation(acceptInvitationDto: AcceptInvitationDto): Promise<{
    success: boolean;
    newUserCreated: boolean;
    friendshipCreated: boolean;
    inviter: User;
    invitee: User;
  }> {
    const {
      inviterLineUserId,
      inviteeLineUserId,
      inviteeDisplayName,
      inviteeProfileImageUrl,
    } = acceptInvitationDto;

    // Find inviter by LINE ID
    const inviter = await this.userRepository.findOne({
      where: { lineUserId: inviterLineUserId },
    });

    if (!inviter) {
      throw new NotFoundException('Inviter not found');
    }

    // Find or create invitee user
    let invitee = await this.userRepository.findOne({
      where: { lineUserId: inviteeLineUserId },
    });

    let newUserCreated = false;
    if (!invitee) {
      // Create new user
      invitee = await this.createNewLineUser(
        inviteeLineUserId,
        inviteeDisplayName,
        inviteeProfileImageUrl,
      );
      newUserCreated = true;
    }

    // Prevent self-invitation
    if (inviter.id === invitee.id) {
      throw new BadRequestException('Cannot invite yourself');
    }

    // Check if they are already friends
    const existingFriendship = await this.friendshipRepository.findOne({
      where: [
        { userId: inviter.id, friendId: invitee.id },
        { userId: invitee.id, friendId: inviter.id },
      ],
    });

    let friendshipCreated = false;
    if (!existingFriendship) {
      // Create bidirectional friendship
      await this.createBidirectionalFriendship(inviter.id, invitee.id);
      friendshipCreated = true;
    }

    // Update inviter stats if new user was created
    if (newUserCreated) {
      await this.updateInviterStats(inviter.id, true);
    }

    return {
      success: true,
      newUserCreated,
      friendshipCreated,
      inviter,
      invitee,
    };
  }

  /**
   * Get invitation statistics for a user
   */
  async getInvitationStats(userId: string) {
    const stats = await this.userStatsRepository.findOne({
      where: { userId },
    });

    return {
      totalInvitationsSent: stats?.totalInvitationsSent || 0,
      successfulInvitationsCount: stats?.successfulInvitationsCount || 0,
    };
  }

  /**
   * Create new LINE user without wallet
   */
  private async createNewLineUser(
    lineUserId: string,
    displayName?: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _profileImageUrl?: string,
  ): Promise<User> {
    const user = this.userRepository.create({
      lineUserId,
      username: displayName,
      lastLoginAt: new Date(),
    });

    const savedUser = await this.userRepository.save(user);

    // Create user stats
    const stats = this.userStatsRepository.create({
      userId: savedUser.id,
    });
    await this.userStatsRepository.save(stats);

    return savedUser;
  }

  /**
   * Create bidirectional friendship
   */
  private async createBidirectionalFriendship(
    userId1: string,
    userId2: string,
  ): Promise<void> {
    const friendship1 = this.friendshipRepository.create({
      userId: userId1,
      friendId: userId2,
      status: FriendshipStatus.ACCEPTED,
    });

    const friendship2 = this.friendshipRepository.create({
      userId: userId2,
      friendId: userId1,
      status: FriendshipStatus.ACCEPTED,
    });

    await this.friendshipRepository.save([friendship1, friendship2]);
  }

  /**
   * Update inviter statistics
   */
  private async updateInviterStats(
    inviterId: string,
    successfulInvitation: boolean,
  ): Promise<void> {
    let stats = await this.userStatsRepository.findOne({
      where: { userId: inviterId },
    });

    if (!stats) {
      stats = this.userStatsRepository.create({
        userId: inviterId,
        totalInvitationsSent: 1,
        successfulInvitationsCount: successfulInvitation ? 1 : 0,
      });
    } else {
      stats.totalInvitationsSent += 1;
      if (successfulInvitation) {
        stats.successfulInvitationsCount += 1;
      }
    }

    await this.userStatsRepository.save(stats);
  }
}
