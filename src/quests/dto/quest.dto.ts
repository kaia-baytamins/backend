import { IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { QuestType, QuestCategory } from '../../entities';

export class GetQuestsDto {
  @ApiProperty({
    description: 'Filter by quest type',
    enum: QuestType,
    required: false,
  })
  @IsOptional()
  @IsEnum(QuestType)
  type?: QuestType;

  @ApiProperty({
    description: 'Filter by quest category',
    enum: QuestCategory,
    required: false,
  })
  @IsOptional()
  @IsEnum(QuestCategory)
  category?: QuestCategory;

  @ApiProperty({
    description: 'Number of quests to return',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class QuestProgressDto {
  @ApiProperty({ description: 'Quest ID' })
  questId: string;

  @ApiProperty({ description: 'Current progress value' })
  progress: number;

  @ApiProperty({ description: 'Target amount to complete' })
  targetAmount: number;

  @ApiProperty({ description: 'Progress percentage' })
  progressPercentage: number;

  @ApiProperty({ description: 'Quest status' })
  status: string;

  @ApiProperty({ description: 'Can quest be claimed' })
  canClaim: boolean;

  @ApiProperty({ description: 'Quest details' })
  quest: {
    title: string;
    description: string;
    type: string;
    category: string;
    rewards: any;
  };
}
