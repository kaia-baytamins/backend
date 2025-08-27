import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { ExplorationRecord } from './exploration-record.entity';

export enum PlanetType {
  CLOSE = 'close',
  MEDIUM = 'medium',
  FAR = 'far',
  LEGENDARY = 'legendary',
}

export enum PlanetDifficulty {
  EASY = 'easy',
  NORMAL = 'normal',
  HARD = 'hard',
  EXTREME = 'extreme',
}

@Entity('planets')
export class Planet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: PlanetType,
  })
  type: PlanetType;

  @Column({
    type: 'enum',
    enum: PlanetDifficulty,
    default: PlanetDifficulty.NORMAL,
  })
  difficulty: PlanetDifficulty;

  @Column({ default: 100 })
  requiredPower: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0.5 })
  successRate: number;

  @Column({ default: 60 })
  explorationTimeMinutes: number;

  @Column({ type: 'json', nullable: true })
  rewards: {
    kaiaAmount: number;
    experience: number;
    nftChance: number;
    specialItems?: string[];
  };

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ nullable: true })
  nftContractAddress: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isEventPlanet: boolean;

  @Column({ nullable: true })
  eventStartDate: Date;

  @Column({ nullable: true })
  eventEndDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => ExplorationRecord, (record) => record.planet)
  explorationRecords: ExplorationRecord[];

  // Check if planet is available for exploration
  get isAvailable(): boolean {
    if (!this.isActive) return false;

    if (this.isEventPlanet) {
      const now = new Date();
      return (
        this.eventStartDate &&
        this.eventEndDate &&
        now >= this.eventStartDate &&
        now <= this.eventEndDate
      );
    }

    return true;
  }

  // Calculate success rate based on user power
  calculateSuccessRate(userTotalPower: number): number {
    const powerRatio = userTotalPower / this.requiredPower;

    if (powerRatio >= 2) return Math.min(0.95, this.successRate + 0.3);
    if (powerRatio >= 1.5) return Math.min(0.9, this.successRate + 0.2);
    if (powerRatio >= 1.2) return Math.min(0.8, this.successRate + 0.1);
    if (powerRatio >= 1) return this.successRate;
    if (powerRatio >= 0.8) return Math.max(0.1, this.successRate - 0.2);

    return Math.max(0.05, this.successRate - 0.4);
  }
}
