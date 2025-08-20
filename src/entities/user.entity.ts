import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  OneToOne,
} from 'typeorm';
import { Pet } from './pet.entity';
import { Spaceship } from './spaceship.entity';
import { ExplorationRecord } from './exploration-record.entity';
import { MarketplaceItem } from './marketplace-item.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  walletAddress: string;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  email: string;

  @Column({ nullable: true })
  lineUserId: string;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  kaiaBalance: number;

  @Column({ default: 0 })
  totalExplorations: number;

  @Column({ default: 0 })
  successfulExplorations: number;

  @Column({ type: 'decimal', precision: 20, scale: 8, default: 0 })
  totalStaked: number;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'bigint', default: 0 })
  experience: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @OneToOne(() => Pet, (pet) => pet.owner, { cascade: true })
  pet: Pet;

  @OneToOne(() => Spaceship, (spaceship) => spaceship.owner, { cascade: true })
  spaceship: Spaceship;

  @OneToMany(() => ExplorationRecord, (record) => record.user)
  explorationRecords: ExplorationRecord[];

  @OneToMany(() => MarketplaceItem, (item) => item.seller)
  marketplaceItems: MarketplaceItem[];
}
