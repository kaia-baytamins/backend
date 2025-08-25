import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { User } from '../entities/user.entity';
import { Friendship } from '../entities/friendship.entity';
import { RemoveFriendDto } from './dto/friend.dto';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Friendship)
    private readonly friendshipRepository: Repository<Friendship>,
  ) {}

  /**
   * Get user's friends list
   */
  async getFriends(userId: string): Promise<User[]> {
    const friendships = await this.friendshipRepository.find({
      where: { userId },
      relations: ['friend'],
    });

    return friendships.map((friendship) => friendship.friend);
  }

  /**
   * Remove friend (bidirectional)
   */
  async removeFriend(
    userId: string,
    removeFriendDto: RemoveFriendDto,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const { friendId } = removeFriendDto;

    // Verify friend exists
    const friend = await this.userRepository.findOne({
      where: { id: friendId },
    });

    if (!friend) {
      throw new NotFoundException('Friend not found');
    }

    // Find existing friendships (both directions)
    const friendships = await this.friendshipRepository.find({
      where: [
        { userId, friendId },
        { userId: friendId, friendId: userId },
      ],
    });

    if (friendships.length === 0) {
      throw new NotFoundException('Friendship not found');
    }

    // Remove both directions
    await this.friendshipRepository.remove(friendships);

    return {
      success: true,
      message: 'Friend removed successfully',
    };
  }

  /**
   * Get friends count for a user
   */
  async getFriendsCount(userId: string): Promise<number> {
    return await this.friendshipRepository.count({
      where: { userId },
    });
  }

  /**
   * Check if two users are friends
   */
  async areFriends(userId1: string, userId2: string): Promise<boolean> {
    const friendship = await this.friendshipRepository.findOne({
      where: { userId: userId1, friendId: userId2 },
    });

    return !!friendship;
  }
}
