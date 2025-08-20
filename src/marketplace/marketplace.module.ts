import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MarketplaceService } from './marketplace.service';
import { MarketplaceController } from './marketplace.controller';
import { MarketplaceItem, User, SpaceshipItem } from '../entities';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MarketplaceItem, User, SpaceshipItem]),
    BlockchainModule,
  ],
  controllers: [MarketplaceController],
  providers: [MarketplaceService],
  exports: [MarketplaceService],
})
export class MarketplaceModule {}
