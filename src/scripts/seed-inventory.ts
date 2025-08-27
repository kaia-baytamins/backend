import { DataSource } from 'typeorm';
import { UserInventory } from '../entities/user-inventory.entity';

// 더미 인벤토리 데이터
const dummyInventories = [
  {
    walletAddress: '0x1234567890123456789012345678901234567890', // 김민수
    items: [
      { itemId: 0, amount: 5 }, // 엔진 common
      { itemId: 1, amount: 3 }, // 엔진 common
      { itemId: 16, amount: 10 }, // 재료 common
      { itemId: 17, amount: 7 }, // 재료 common
      { itemId: 32, amount: 1 }, // 특수장비 common
    ],
  },
  {
    walletAddress: '0x2345678901234567890123456789012345678901', // 田中さくら
    items: [
      { itemId: 6, amount: 2 }, // 엔진 rare
      { itemId: 22, amount: 8 }, // 재료 rare
      { itemId: 23, amount: 5 }, // 재료 rare
      { itemId: 38, amount: 1 }, // 특수장비 rare
      { itemId: 48, amount: 3 }, // 연료탱크 common
    ],
  },
  {
    walletAddress: '0x3456789012345678901234567890123456789012', // 이준호
    items: [
      { itemId: 2, amount: 4 }, // 엔진 common
      { itemId: 18, amount: 12 }, // 재료 common
      { itemId: 49, amount: 2 }, // 연료탱크 common
    ],
  },
  {
    walletAddress: '0x4567890123456789012345678901234567890123', // 山田ひかり
    items: [
      { itemId: 10, amount: 1 }, // 엔진 epic
      { itemId: 26, amount: 1 }, // 재료 epic
      { itemId: 42, amount: 1 }, // 특수장비 epic
      { itemId: 58, amount: 1 }, // 연료탱크 epic
      { itemId: 7, amount: 3 }, // 엔진 rare
      { itemId: 24, amount: 5 }, // 재료 rare
    ],
  },
  {
    walletAddress: '0x5678901234567890123456789012345678901234', // 박소영
    items: [
      { itemId: 3, amount: 6 }, // 엔진 common
      { itemId: 19, amount: 8 }, // 재료 common
      { itemId: 35, amount: 2 }, // 특수장비 common
      { itemId: 51, amount: 4 }, // 연료탱크 common
    ],
  },
  {
    walletAddress: '0x6789012345678901234567890123456789012345', // 佐藤ゆうき
    items: [
      { itemId: 4, amount: 2 }, // 엔진 common
      { itemId: 20, amount: 6 }, // 재료 common
      { itemId: 52, amount: 3 }, // 연료탱크 common
    ],
  },
  {
    walletAddress: '0x7890123456789012345678901234567890123456', // 최현우
    items: [
      { itemId: 8, amount: 2 }, // 엔진 rare
      { itemId: 9, amount: 1 }, // 엔진 rare
      { itemId: 25, amount: 4 }, // 재료 rare
      { itemId: 41, amount: 1 }, // 특수장비 rare
      { itemId: 57, amount: 2 }, // 연료탱크 rare
    ],
  },
  {
    walletAddress: '0x8901234567890123456789012345678901234567', // 鈴木まり
    items: [
      { itemId: 5, amount: 1 }, // 엔진 common
      { itemId: 21, amount: 3 }, // 재료 common
      { itemId: 53, amount: 1 }, // 연료탱크 common
    ],
  },
];

export async function seedInventory(dataSource: DataSource) {
  const inventoryRepository = dataSource.getRepository(UserInventory);

  console.log('🎒 Starting to seed inventory data...');

  for (const userData of dummyInventories) {
    console.log(
      `📦 Creating inventory for wallet: ${userData.walletAddress.slice(0, 10)}...`,
    );

    for (const item of userData.items) {
      // Check if item already exists
      const existingItem = await inventoryRepository.findOne({
        where: {
          walletAddress: userData.walletAddress,
          itemId: item.itemId,
        },
      });

      if (existingItem) {
        console.log(`  ↳ Item ${item.itemId} already exists, skipping...`);
        continue;
      }

      // Create inventory item
      const inventoryItem = inventoryRepository.create({
        walletAddress: userData.walletAddress,
        itemId: item.itemId,
        amount: item.amount,
        lastSyncedAt: new Date(),
      });

      await inventoryRepository.save(inventoryItem);
      console.log(`  ✅ Added Item ID ${item.itemId} x${item.amount}`);
    }
  }

  console.log('🎉 Inventory data seeded successfully!');
}
