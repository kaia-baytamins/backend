import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { UserInventory } from '../entities/user-inventory.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(UserInventory)
    private readonly inventoryRepository: Repository<UserInventory>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get user inventory by LINE ID (해당 유저의 지갑 인벤토리)
   */
  async getUserInventoryByLineId(
    lineUserId: string,
  ): Promise<Record<number, number>> {
    // LINE ID로 유저 찾기
    const user = await this.userRepository.findOne({
      where: { lineUserId },
      select: ['walletAddress'], // 연결된 지갑 주소 가져오기
    });

    if (!user || !user.walletAddress) {
      return {}; // 빈 인벤토리 반환
    }

    return this.getInventoryByWalletAddress(user.walletAddress);
  }

  /**
   * Get inventory by specific wallet address (장착되지 않은 아이템만)
   */
  async getInventoryByWalletAddress(
    walletAddress: string,
  ): Promise<Record<number, number>> {
    const inventoryItems = await this.inventoryRepository.find({
      where: { walletAddress, amount: MoreThan(0), isEquipped: false },
    });

    // {itemId: amount} 형태로 변환
    const inventory: Record<number, number> = {};
    for (const item of inventoryItems) {
      inventory[item.itemId] = item.amount;
    }

    return inventory;
  }

  /**
   * Update wallet inventory (블록체인 동기화 시 사용)
   */
  async updateWalletInventory(
    walletAddress: string,
    itemId: number,
    amount: number,
  ): Promise<UserInventory> {
    let inventoryItem = await this.inventoryRepository.findOne({
      where: { walletAddress, itemId },
    });

    if (!inventoryItem) {
      // 새 아이템 생성
      inventoryItem = this.inventoryRepository.create({
        walletAddress,
        itemId,
        amount,
        lastSyncedAt: new Date(),
      });
    } else {
      // 기존 아이템 업데이트
      inventoryItem.amount = amount;
      inventoryItem.lastSyncedAt = new Date();
    }

    return await this.inventoryRepository.save(inventoryItem);
  }

  /**
   * Bulk update wallet inventory (여러 아이템 한번에 업데이트)
   */
  async bulkUpdateWalletInventory(
    walletAddress: string,
    items: Array<{ itemId: number; amount: number }>,
  ): Promise<void> {
    for (const item of items) {
      await this.updateWalletInventory(walletAddress, item.itemId, item.amount);
    }
  }

  /**
   * Get inventory by item type for specific wallet (장착되지 않은 아이템만)
   */
  async getWalletInventoryByType(
    walletAddress: string,
    itemType: 'engine' | 'material' | 'special_equipment' | 'fuel_tank',
  ): Promise<Record<number, number>> {
    let startId: number;
    let endId: number;

    switch (itemType) {
      case 'engine':
        startId = 0;
        endId = 15;
        break;
      case 'material':
        startId = 16;
        endId = 31;
        break;
      case 'special_equipment':
        startId = 32;
        endId = 47;
        break;
      case 'fuel_tank':
        startId = 48;
        endId = 63;
        break;
      default:
        throw new Error('Invalid item type');
    }

    const inventoryItems = await this.inventoryRepository
      .createQueryBuilder('inventory')
      .where('inventory.walletAddress = :walletAddress', { walletAddress })
      .andWhere('inventory.itemId >= :startId', { startId })
      .andWhere('inventory.itemId <= :endId', { endId })
      .andWhere('inventory.amount > 0')
      .andWhere('inventory.isEquipped = false')
      .getMany();

    const inventory: Record<number, number> = {};
    for (const item of inventoryItems) {
      inventory[item.itemId] = item.amount;
    }

    return inventory;
  }

  /**
   * 아이템 장착
   */
  async equipItem(walletAddress: string, itemId: number): Promise<any> {
    // 1. 인벤토리에서 해당 아이템 보유 및 미장착 확인
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { walletAddress, itemId, isEquipped: false },
    });

    if (!inventoryItem || inventoryItem.amount <= 0) {
      throw new Error('Item not found in inventory');
    }

    // 2. 아이템 타입 확인
    const itemType = this.getItemTypeFromId(itemId);

    // 3. 같은 타입의 기존 장착 아이템 해제 (인벤토리로 복구)
    const equippedSameType = await this.inventoryRepository.find({
      where: { walletAddress, isEquipped: true },
    });

    for (const item of equippedSameType) {
      if (this.getItemTypeFromId(item.itemId) === itemType) {
        // 기존 장착 아이템을 인벤토리로 복구
        const existingInInventory = await this.inventoryRepository.findOne({
          where: { walletAddress, itemId: item.itemId, isEquipped: false },
        });

        if (existingInInventory) {
          existingInInventory.amount += 1;
          await this.inventoryRepository.save(existingInInventory);
        } else {
          // 장착된 아이템을 인벤토리로 변경 (새로 만들지 않고 기존 것을 수정)
          item.isEquipped = false;
          item.amount = 1;
          await this.inventoryRepository.save(item);
        }

        // 새로 만든 경우가 아니면 여기서 삭제하지 않음
        if (existingInInventory) {
          await this.inventoryRepository.remove(item);
        }
      }
    }

    // 4. 인벤토리에서 아이템 장착으로 변경
    inventoryItem.isEquipped = true;
    if (inventoryItem.amount > 1) {
      inventoryItem.amount -= 1;
    }
    await this.inventoryRepository.save(inventoryItem);

    return {
      success: true,
      message: 'Item equipped successfully',
      equippedItem: {
        itemId,
        name: this.getItemName(itemId, itemType),
        type: itemType,
        rarity: this.getItemRarity(itemId),
      },
    };
  }

  /**
   * 아이템 해제
   */
  async unequipItem(walletAddress: string, itemId: number): Promise<any> {
    // 1. 장착된 아이템 찾기
    const equippedItem = await this.inventoryRepository.findOne({
      where: { walletAddress, itemId, isEquipped: true },
    });

    if (!equippedItem) {
      throw new Error('Item not equipped or not found');
    }

    // 2. 장착된 아이템 삭제
    await this.inventoryRepository.remove(equippedItem);

    // 3. 인벤토리에 아이템 추가 (기존에 있으면 수량 증가, 없으면 새로 생성)
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { walletAddress, itemId, isEquipped: false },
    });

    if (inventoryItem) {
      inventoryItem.amount += 1;
      await this.inventoryRepository.save(inventoryItem);
    } else {
      await this.inventoryRepository.save(
        this.inventoryRepository.create({
          walletAddress,
          itemId,
          amount: 1,
          isEquipped: false,
          lastSyncedAt: new Date(),
        }),
      );
    }

    const itemType = this.getItemTypeFromId(itemId);

    return {
      success: true,
      message: 'Item unequipped successfully',
      unequippedItem: {
        itemId,
        name: this.getItemName(itemId, itemType),
        type: itemType,
      },
    };
  }

  /**
   * 장착된 아이템 조회
   */
  async getEquippedItems(walletAddress: string): Promise<any> {
    const equippedItems = await this.inventoryRepository.find({
      where: { walletAddress, isEquipped: true },
    });

    const equipment = {
      engine: null,
      material: null,
      specialEquipment: null,
      fuelTank: null,
    };

    for (const item of equippedItems) {
      const itemType = this.getItemTypeFromId(item.itemId);
      const formattedItem = {
        itemId: item.itemId,
        name: this.getItemName(item.itemId, itemType),
        type: itemType,
        rarity: this.getItemRarity(item.itemId),
        powerBoost: this.getPowerBoost(
          item.itemId,
          this.getItemRarity(item.itemId),
        ),
      };

      if (itemType === 'engine') equipment.engine = formattedItem;
      if (itemType === 'material') equipment.material = formattedItem;
      if (itemType === 'special_equipment')
        equipment.specialEquipment = formattedItem;
      if (itemType === 'fuel_tank') equipment.fuelTank = formattedItem;
    }

    return { equipment };
  }

  // Helper 함수들
  private getItemTypeFromId(itemId: number): string {
    if (itemId >= 0 && itemId <= 15) return 'engine';
    if (itemId >= 16 && itemId <= 31) return 'material';
    if (itemId >= 32 && itemId <= 47) return 'special_equipment';
    if (itemId >= 48 && itemId <= 63) return 'fuel_tank';
    throw new Error('Invalid item ID');
  }

  private getItemName(itemId: number, itemType: string): string {
    const typeNames = {
      engine: 'Engine',
      material: 'Material',
      special_equipment: 'Special Equipment',
      fuel_tank: 'Fuel Tank',
    };
    return `${typeNames[itemType]} #${itemId}`;
  }

  private getItemRarity(itemId: number): string {
    const baseId = itemId % 16;
    if (baseId <= 5) return 'common';
    if (baseId <= 9) return 'rare';
    if (baseId <= 12) return 'epic';
    return 'legendary';
  }

  private getPowerBoost(itemId: number, rarity: string): number {
    const rarityMultiplier = {
      common: 10,
      rare: 25,
      epic: 50,
      legendary: 100,
    };
    return rarityMultiplier[rarity];
  }

  private getStatBoost(rarity: string): number {
    const rarityBoost = {
      common: 5,
      rare: 15,
      epic: 30,
      legendary: 60,
    };
    return rarityBoost[rarity];
  }

  /**
   * 아이템 판매 (인벤토리에서 제거)
   */
  async sellItem(
    walletAddress: string,
    itemId: number,
    price: number,
  ): Promise<any> {
    // 1. 인벤토리에서 해당 아이템 확인 (미장착 상태여야 함)
    const inventoryItem = await this.inventoryRepository.findOne({
      where: { walletAddress, itemId, isEquipped: false },
    });

    if (!inventoryItem || inventoryItem.amount <= 0) {
      throw new Error('Item not found in inventory or insufficient quantity');
    }

    // 2. 아이템 정보 가져오기
    const itemType = this.getItemTypeFromId(itemId);
    const itemName = this.getItemName(itemId, itemType);

    // 3. 인벤토리에서 아이템 1개 제거
    if (inventoryItem.amount > 1) {
      // 수량이 1개 이상이면 수량만 감소
      inventoryItem.amount -= 1;
      await this.inventoryRepository.save(inventoryItem);
    } else {
      // 수량이 1개면 완전히 제거
      await this.inventoryRepository.remove(inventoryItem);
    }

    return {
      success: true,
      message: 'Item sold successfully',
      soldItem: {
        itemId,
        name: itemName,
        type: itemType,
        price,
      },
    };
  }
}
