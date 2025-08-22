import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { QuestsService } from './quests.service';
import { QuestsController } from './quests.controller';
import { DefiQuestController } from './controllers/defi-quest.controller';
import { Quest, UserQuest, User } from '../entities';
import { BlockchainModule } from '../blockchain/blockchain.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Quest, UserQuest, User]),
    BlockchainModule,
    UsersModule,
  ],
  controllers: [QuestsController, DefiQuestController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
