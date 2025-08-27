import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('user_inventories')
@Index(['walletAddress', 'itemId'], { unique: true })
export class UserInventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  walletAddress: string; // 지갑 주소별로 인벤토리 관리

  @Column()
  itemId: number; // ERC1155 token ID

  @Column({ default: 0 })
  amount: number; // 보유 개수

  @Column({ default: false })
  isEquipped: boolean; // 장착 여부

  @Column({ nullable: true })
  lastSyncedAt: Date; // 마지막 블록체인 동기화 시간

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // User와의 관계는 지갑 주소를 통해 간접적으로 연결
  // 필요시 walletAddress로 User를 조회할 수 있음

  // 아이템 타입별 범위 체크
  get itemType(): string {
    if (this.itemId >= 0 && this.itemId <= 15) return 'engine';
    if (this.itemId >= 16 && this.itemId <= 31) return 'material';
    if (this.itemId >= 32 && this.itemId <= 47) return 'special_equipment';
    if (this.itemId >= 48 && this.itemId <= 63) return 'fuel_tank';
    return 'unknown';
  }

  // 등급 체크 (각 타입 내에서의 인덱스 기준)
  get rarity(): string {
    const indexInType = this.itemId % 16;
    if (indexInType < 6) return 'common';
    if (indexInType < 10) return 'rare';
    if (indexInType < 13) return 'epic';
    return 'legendary';
  }
}
