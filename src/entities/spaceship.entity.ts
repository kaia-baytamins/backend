import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { SpaceshipItem } from './spaceship-item.entity';

export enum SpaceshipType {
  BASIC = 'basic',
  ADVANCED = 'advanced',
  ELITE = 'elite',
  LEGENDARY = 'legendary',
}

@Entity('spaceships')
export class Spaceship {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: SpaceshipType,
    default: SpaceshipType.BASIC,
  })
  type: SpaceshipType;

  @Column({ default: 100 })
  engine: number;

  @Column({ default: 100 })
  fuel: number;

  @Column({ default: 100 })
  maxFuel: number;

  @Column({ default: 50 })
  reinforcement: number;

  @Column({ default: 1 })
  level: number;

  @Column({ type: 'bigint', default: 0 })
  experience: number;

  @Column({ default: 0 })
  upgradeCount: number;

  @Column({ nullable: true })
  lastMaintenanceAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  ownerId: string;

  @OneToOne(() => User, (user) => user.spaceship)
  @JoinColumn({ name: 'ownerId' })
  owner: User;

  @OneToMany(() => SpaceshipItem, (item) => item.spaceship, { cascade: true })
  items: SpaceshipItem[];

  // Calculated power for exploration
  get totalPower(): number {
    const baseSpaceshipPower = this.engine + this.fuel + this.reinforcement;
    const itemsPower =
      this.items?.reduce((total, item) => total + item.powerBoost, 0) || 0;
    return baseSpaceshipPower + itemsPower;
  }

  // Check if spaceship needs maintenance
  get needsMaintenance(): boolean {
    const now = new Date();
    if (!this.lastMaintenanceAt) return false;

    const timeDiff = now.getTime() - this.lastMaintenanceAt.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    return hoursDiff >= 24; // Needs maintenance every 24 hours
  }

  // Get exploration range based on power
  get explorationRange(): number {
    const totalPower = this.totalPower;
    if (totalPower < 200) return 1; // Close planets
    if (totalPower < 400) return 2; // Medium planets
    if (totalPower < 600) return 3; // Far planets
    return 4; // Legendary planets
  }
}
