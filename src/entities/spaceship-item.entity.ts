import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Spaceship } from './spaceship.entity';

export enum ItemType {
  ENGINE = 'engine',
  MATERIAL = 'material',
  SPECIAL_EQUIPMENT = 'special_equipment',
  FUEL_TANK = 'fuel_tank',
}

export enum ItemRarity {
  COMMON = 'common',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

@Entity('spaceship_items')
export class SpaceshipItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: ItemType,
  })
  type: ItemType;

  @Column({
    type: 'enum',
    enum: ItemRarity,
    default: ItemRarity.COMMON,
  })
  rarity: ItemRarity;

  @Column({ default: 0 })
  powerBoost: number;

  @Column({ default: 0 })
  fuelBoost: number;

  @Column({ default: 0 })
  engineBoost: number;

  @Column({ default: 0 })
  reinforcementBoost: number;

  @Column({ nullable: true })
  nftTokenId: string;

  @Column({ default: false })
  isEquipped: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  spaceshipId: string;

  @ManyToOne(() => Spaceship, (spaceship) => spaceship.items)
  @JoinColumn({ name: 'spaceshipId' })
  spaceship: Spaceship;
}
