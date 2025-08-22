import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { UserQuest } from './user-quest.entity';

export enum QuestType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  SPECIAL = 'special',
  LEGENDARY = 'legendary',
}

export enum QuestCategory {
  STAKING = 'staking',
  LENDING = 'lending',
  LP_PROVIDING = 'lp_providing',
  EXPLORATION = 'exploration',
  PET_CARE = 'pet_care',
  TRADING = 'trading',
  SOCIAL = 'social',
}

@Entity('quests')
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: QuestType,
  })
  type: QuestType;

  @Column({
    type: 'enum',
    enum: QuestCategory,
  })
  category: QuestCategory;

  @Column({ type: 'json' })
  requirements: {
    action: string;
    amount?: number;
    duration?: number; // in hours
    target?: string;
    conditions?: Record<string, any>;
  };

  @Column({ type: 'json' })
  rewards: {
    kaiaAmount?: number;
    experience?: number;
    nftTokenId?: string;
    items?: Array<{
      type: string;
      rarity: string;
      name: string;
    }>;
  };

  @Column({ default: 0 })
  maxCompletions: number; // 0 = unlimited

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  stakingRequirement: number;

  @Column({ default: 0 })
  levelRequirement: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  startDate: Date;

  @Column({ nullable: true })
  endDate: Date;

  @Column({ default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => UserQuest, (userQuest) => userQuest.quest)
  userQuests: UserQuest[];

  // Check if quest is currently available
  get isAvailable(): boolean {
    if (!this.isActive) return false;

    const now = new Date();

    if (this.startDate && now < this.startDate) return false;
    if (this.endDate && now > this.endDate) return false;

    return true;
  }

  // Check if quest is repeatable
  get isRepeatable(): boolean {
    return this.type === QuestType.DAILY || this.maxCompletions === 0;
  }
}
