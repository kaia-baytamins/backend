import {
  IsString,
  IsOptional,
  IsEmail,
  MinLength,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserProfileDto {
  @ApiProperty({
    description: 'Username for the user',
    example: 'SpaceExplorer123',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(20)
  username?: string;

  @ApiProperty({
    description: 'Email address',
    example: 'user@example.com',
    required: false,
  })
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class UserStatsDto {
  @ApiProperty({ description: 'User ID' })
  id: string;

  @ApiProperty({ description: 'Wallet address' })
  walletAddress: string;

  @ApiProperty({ description: 'Username' })
  username: string;

  @ApiProperty({ description: 'User level' })
  level: number;

  @ApiProperty({ description: 'Total experience points' })
  experience: number;

  @ApiProperty({ description: 'Total explorations completed' })
  totalExplorations: number;

  @ApiProperty({ description: 'Successful explorations' })
  successfulExplorations: number;

  @ApiProperty({ description: 'Total KAIA staked' })
  totalStaked: number;

  @ApiProperty({ description: 'Pet information' })
  pet: {
    name: string;
    type: string;
    level: number;
    totalPower: number;
  };

  @ApiProperty({ description: 'Spaceship information' })
  spaceship: {
    name: string;
    type: string;
    level: number;
    totalPower: number;
  };
}
