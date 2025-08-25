import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SimpleAuthGuard } from './guards/simple-auth.guard';
import { User, Pet, Spaceship } from '../entities';
import { UserStats } from '../entities/user-stats.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Pet, Spaceship, UserStats])],
  controllers: [AuthController],
  providers: [AuthService, SimpleAuthGuard],
  exports: [AuthService, SimpleAuthGuard],
})
export class AuthModule {}
