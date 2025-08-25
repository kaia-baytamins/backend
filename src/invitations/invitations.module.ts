import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { InvitationsController } from './invitations.controller';
import { InvitationsService } from './invitations.service';
import { User } from '../entities/user.entity';
import { Friendship } from '../entities/friendship.entity';
import { UserStats } from '../entities/user-stats.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Friendship, UserStats])],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
