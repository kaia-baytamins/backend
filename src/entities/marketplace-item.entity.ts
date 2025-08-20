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
import { ItemType, ItemRarity } from './spaceship-item.entity';

export enum MarketplaceStatus {
  ACTIVE = 'active',
  SOLD = 'sold',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired',
}

@Entity('marketplace_items')
export class MarketplaceItem {
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
  itemType: ItemType;

  @Column({
    type: 'enum',
    enum: ItemRarity,
  })
  rarity: ItemRarity;

  @Column({ type: 'decimal', precision: 20, scale: 8 })
  price: number;

  @Column({
    type: 'enum',
    enum: MarketplaceStatus,
    default: MarketplaceStatus.ACTIVE,
  })
  status: MarketplaceStatus;

  @Column({ nullable: true })
  nftTokenId: string;

  @Column({ type: 'json', nullable: true })
  attributes: {
    powerBoost?: number;
    fuelBoost?: number;
    engineBoost?: number;
    reinforcementBoost?: number;
    special?: Record<string, any>;
  };

  @Column({ nullable: true })
  imageUrl: string;

  @Column({ default: 0 })
  viewCount: number;

  @Column({ default: 0 })
  favoriteCount: number;

  @Column()
  expiresAt: Date;

  @Column({ nullable: true })
  soldAt: Date;

  @Column({ nullable: true })
  buyerId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column()
  sellerId: string;

  @ManyToOne(() => User, (user) => user.marketplaceItems)
  @JoinColumn({ name: 'sellerId' })
  seller: User;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'buyerId' })
  buyer: User;

  // Check if item is still available for purchase
  get isAvailable(): boolean {
    if (this.status !== MarketplaceStatus.ACTIVE) return false;
    return new Date() < this.expiresAt;
  }

  // Check if item has expired
  get hasExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  // Get item rarity bonus
  get rarityMultiplier(): number {
    switch (this.rarity) {
      case ItemRarity.COMMON:
        return 1;
      case ItemRarity.RARE:
        return 1.5;
      case ItemRarity.EPIC:
        return 2;
      case ItemRarity.LEGENDARY:
        return 3;
      default:
        return 1;
    }
  }

  // Calculate total power boost
  get totalPowerBoost(): number {
    const attributes = this.attributes || {};
    return (
      ((attributes.powerBoost || 0) +
        (attributes.fuelBoost || 0) +
        (attributes.engineBoost || 0) +
        (attributes.reinforcementBoost || 0)) *
      this.rarityMultiplier
    );
  }
}
