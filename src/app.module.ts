import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

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
import { InvitationsModule } from './invitations/invitations.module';
import { FriendsModule } from './friends/friends.module';

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
        ],
        synchronize: configService.get('nodeEnv') !== 'production',
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

    // JWT configuration
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expirationTime'),
        },
      }),
    }),

    // Passport for authentication
    PassportModule.register({ defaultStrategy: 'jwt' }),

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
  ],
})
export class AppModule {}
