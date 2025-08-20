import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Planet } from './planet.entity';

export enum ExplorationStatus {
  IN_PROGRESS = 'in_progress',
  SUCCESS = 'success',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Entity('exploration_records')
export class ExplorationRecord {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ExplorationStatus,
    default: ExplorationStatus.IN_PROGRESS,
  })
  status: ExplorationStatus;

  @Column()
  startTime: Date;

  @Column({ nullable: true })
  endTime: Date;

  @Column({ default: 0 })
  userPowerAtStart: number;

  @Column({ default: 0 })
  petPowerAtStart: number;

  @Column({ default: 0 })
  spaceshipPowerAtStart: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  calculatedSuccessRate: number;

  @Column({ type: 'json', nullable: true })
  rewards: {
    kaiaAmount?: number;
    experience?: number;
    nftTokenId?: string;
    items?: string[];
  };

  @Column({ nullable: true })
  failureReason: string;

  @Column({ nullable: true })
  nftTokenId: string;

  @Column({ default: false })
  nftMinted: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: string;

  @Column()
  planetId: string;

  @ManyToOne(() => User, (user) => user.explorationRecords)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Planet, (planet) => planet.explorationRecords)
  @JoinColumn({ name: 'planetId' })
  planet: Planet;

  // Check if exploration is completed
  get isCompleted(): boolean {
    return this.status !== ExplorationStatus.IN_PROGRESS;
  }

  // Check if exploration can be completed (time elapsed)
  get canComplete(): boolean {
    if (!this.planet || this.isCompleted) return false;

    const now = new Date();
    const timeDiff = now.getTime() - this.startTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return minutesDiff >= this.planet.explorationTimeMinutes;
  }

  // Get remaining time for exploration
  get remainingTimeMinutes(): number {
    if (this.isCompleted) return 0;

    const now = new Date();
    const timeDiff = now.getTime() - this.startTime.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    return Math.max(0, this.planet.explorationTimeMinutes - minutesDiff);
  }
}
