import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { User, Pet, Spaceship } from '../entities';

@Module({
  imports: [TypeOrmModule.forFeature([User, Pet, Spaceship])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
