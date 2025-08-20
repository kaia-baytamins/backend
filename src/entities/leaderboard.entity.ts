import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum LeaderboardType {
  TOTAL_EXPLORATIONS = 'total_explorations',
  SUCCESSFUL_EXPLORATIONS = 'successful_explorations',
  TOTAL_STAKED = 'total_staked',
  NFT_COUNT = 'nft_count',
  USER_LEVEL = 'user_level',
  PET_POWER = 'pet_power',
  SPACESHIP_POWER = 'spaceship_power',
  TOTAL_POWER = 'total_power',
}

export enum LeaderboardPeriod {
  ALL_TIME = 'all_time',
  MONTHLY = 'monthly',
  WEEKLY = 'weekly',
  DAILY = 'daily',
}

@Entity('leaderboards')
@Index(['type', 'period', 'rank'])
@Index(['userId', 'type', 'period'], { unique: true })
export class Leaderboard {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: LeaderboardType,
  })
  type: LeaderboardType;

  @Column({
    type: 'enum',
    enum: LeaderboardPeriod,
    default: LeaderboardPeriod.ALL_TIME,
  })
  period: LeaderboardPeriod;

  @Column()
  rank: number;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  score: number;

  @Column({ nullable: true })
  previousRank: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, nullable: true })
  previousScore: number;

  @Column({ type: 'json', nullable: true })
  metadata: {
    petName?: string;
    petType?: string;
    spaceshipName?: string;
    lastExplorationPlanet?: string;
    achievements?: string[];
  };

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Calculate rank change
  get rankChange(): number {
    if (!this.previousRank) return 0;
    return this.previousRank - this.rank;
  }

  // Calculate score change
  get scoreChange(): number {
    if (!this.previousScore) return this.score;
    return this.score - this.previousScore;
  }

  // Check if rank improved
  get rankImproved(): boolean {
    return this.rankChange > 0;
  }

  // Check if score improved
  get scoreImproved(): boolean {
    return this.scoreChange > 0;
  }

  // Get rank change indicator
  get rankChangeIndicator(): 'up' | 'down' | 'same' | 'new' {
    if (!this.previousRank) return 'new';
    if (this.rankChange > 0) return 'up';
    if (this.rankChange < 0) return 'down';
    return 'same';
  }
}
