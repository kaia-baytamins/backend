import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NFTController } from './nft.controller';
import { NFTService } from './nft.service';
import { User } from '../entities/user.entity';
import { Planet } from '../entities/planet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Planet])],
  controllers: [NFTController],
  providers: [NFTService],
  exports: [NFTService],
})
export class NFTModule {}
