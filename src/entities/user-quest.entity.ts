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
import { Quest } from './quest.entity';

export enum QuestStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CLAIMED = 'claimed',
  EXPIRED = 'expired',
}

@Entity('user_quests')
@Index(['userId', 'questId'], { unique: true })
export class UserQuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: QuestStatus,
    default: QuestStatus.NOT_STARTED,
  })
  status: QuestStatus;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: 0 })
  targetAmount: number;

  @Column({ nullable: true })
  startedAt: Date;

  @Column({ nullable: true })
  completedAt: Date;

  @Column({ nullable: true })
  claimedAt: Date;

  @Column({ nullable: true })
  expiresAt: Date;

  @Column({ type: 'json', nullable: true })
  progressData: Record<string, any>;

  @Column({ default: 0 })
  completionCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  userId: string;

  @Column()
  questId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Quest, (quest) => quest.userQuests)
  @JoinColumn({ name: 'questId' })
  quest: Quest;

  // Check if quest can be started
  get canStart(): boolean {
    if (this.status !== QuestStatus.NOT_STARTED) return false;
    if (!this.quest.isAvailable) return false;

    // Check if user meets level requirement
    if (this.quest.levelRequirement > this.user.level) return false;

    return true;
  }

  // Check if quest is completed but not claimed
  get canClaim(): boolean {
    return this.status === QuestStatus.COMPLETED;
  }

  // Check if quest has expired
  get hasExpired(): boolean {
    if (!this.expiresAt) return false;
    return new Date() > this.expiresAt;
  }

  // Calculate progress percentage
  get progressPercentage(): number {
    if (this.targetAmount === 0) return 0;
    return Math.min(100, (this.progress / this.targetAmount) * 100);
  }

  // Update progress
  updateProgress(amount: number, data?: Record<string, any>): void {
    this.progress = Math.min(this.targetAmount, this.progress + amount);

    if (data) {
      this.progressData = { ...this.progressData, ...data };
    }

    if (
      this.progress >= this.targetAmount &&
      this.status === QuestStatus.IN_PROGRESS
    ) {
      this.status = QuestStatus.COMPLETED;
      this.completedAt = new Date();
    }
  }
}
