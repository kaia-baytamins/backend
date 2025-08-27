import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { SimpleAuthGuard } from './auth/guards/simple-auth.guard';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';

// Modules
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { QuestsModule } from './quests/quests.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { BlockchainModule } from './blockchain/blockchain.module';

// Common
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

import {
  User,
  Pet,
  Spaceship,
  SpaceshipItem,
  Planet,
  ExplorationRecord,
  Quest,
  UserQuest,
  MarketplaceItem,
  Leaderboard,
} from './entities';
import { Friendship } from './entities/friendship.entity';
import { UserStats } from './entities/user-stats.entity';
import { Invitation } from './entities/invitation.entity';
import { UserInventory } from './entities/user-inventory.entity';
import { InvitationsModule } from './invitations/invitations.module';
import { FriendsModule } from './friends/friends.module';
import { InventoryModule } from './inventory/inventory.module';
import { NFTModule } from './nft/nft.module';

@Module({
  imports: [
    // Configuration module with validation
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),

    // Database configuration
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mysql',
        host: configService.get('database.host'),
        port: configService.get('database.port'),
        username: configService.get('database.username'),
        password: configService.get('database.password'),
        database: configService.get('database.database'),
        entities: [
          User,
          Pet,
          Spaceship,
          SpaceshipItem,
          Planet,
          ExplorationRecord,
          Quest,
          UserQuest,
          MarketplaceItem,
          Leaderboard,
          Friendship,
          UserStats,
          Invitation,
          UserInventory,
        ],
        synchronize: true, // Force sync to recognize new ownedNFTs column
        logging: configService.get('nodeEnv') === 'development',
      }),
    }),

    // Rate limiting
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get('throttle.ttl') * 1000, // Convert to milliseconds
          limit: configService.get('throttle.limit'),
        },
      ],
    }),

    // Schedule module for cron jobs
    ScheduleModule.forRoot(),

    // Application modules
    AuthModule,
    UsersModule,
    LeaderboardModule,
    QuestsModule,
    MarketplaceModule,
    BlockchainModule,
    InvitationsModule,
    FriendsModule,
    InventoryModule,
    NFTModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: SimpleAuthGuard,
    },
  ],
})
export class AppModule {}
