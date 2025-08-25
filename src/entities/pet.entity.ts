import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum PetType {
  MOMOCO = 'momoco',
  PANLULU = 'panlulu',
  HOSHITANU = 'hoshitanu',
  MIZURU = 'mizuru',
}

export enum PetRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('pets')
export class Pet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: PetType,
    default: PetType.MOMOCO,
  })
  type: PetType;

  @Column({
    type: 'enum',
    enum: PetRarity,
    default: PetRarity.COMMON,
  })
  rarity: PetRarity;

  @Column({ default: 100 })
  health: number;

  @Column({ default: 100 })
  maxHealth: number;

  @Column({ default: 50 })
  agility: number;

  @Column({ default: 50 })
  intelligence: number;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'bigint', default: 0 })
  experience: number;

  @Column({ default: 100 })
  energy: number;

  @Column({ default: 100 })
  maxEnergy: number;

  @Column({ default: 0 })
  trainingCount: number;

  @Column({ nullable: true })
  lastFeedingAt: Date;

  @Column({ nullable: true })
  lastTrainingAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  ownerId: string;

  @OneToOne(() => User, (user) => user.pet)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  // Calculated power for exploration
  get totalPower(): number {
    return this.health + this.agility + this.intelligence;
  }

  // Check if pet can be trained
  get canTrain(): boolean {
    const now = new Date();
    if (!this.lastTrainingAt) return true;

    const timeDiff = now.getTime() - this.lastTrainingAt.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return hoursDiff >= 2; // Can train every 2 hours
  }

  // Check if pet needs feeding
  get needsFeeding(): boolean {
    const now = new Date();
    if (!this.lastFeedingAt) return true;

    const timeDiff = now.getTime() - this.lastFeedingAt.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return hoursDiff >= 8; // Needs feeding every 8 hours
  }
}
