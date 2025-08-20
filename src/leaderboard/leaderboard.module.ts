import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { LeaderboardService } from './leaderboard.service';
import { LeaderboardController } from './leaderboard.controller';
import { Leaderboard, User, Pet, Spaceship } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([Leaderboard, User, Pet, Spaceship])],
  controllers: [LeaderboardController],
  providers: [LeaderboardService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
