import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { UserInventory } from '../entities/user-inventory.entity';

dotenv.config();

// 테스트용 지갑 주소
const TEST_WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';

// 복구할 아이템들 (데모/테스트용)
const RESTORE_ITEMS = [
  { itemId: 1, amount: 1 }, // 기본 엔진 MK-2
  { itemId: 2, amount: 1 }, // 기본 엔진 MK-3
  { itemId: 16, amount: 1 }, // 강철 T-1
];

async function restoreTestInventory() {
  const dataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'kaia_game',
    entities: [UserInventory],
    synchronize: false,
    logging: false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const inventoryRepository = dataSource.getRepository(UserInventory);

    console.log('🔄 Starting inventory restoration...');
    console.log(
      `📦 Restoring items for wallet: ${TEST_WALLET_ADDRESS.slice(0, 10)}...`,
    );

    for (const item of RESTORE_ITEMS) {
      // 이미 존재하는지 확인
      const existingItem = await inventoryRepository.findOne({
        where: {
          walletAddress: TEST_WALLET_ADDRESS,
          itemId: item.itemId,
          isEquipped: false,
        },
      });

      if (existingItem) {
        // 이미 있으면 수량만 증가
        existingItem.amount += item.amount;
        await inventoryRepository.save(existingItem);
        console.log(
          `  ✅ Updated Item ID ${item.itemId} (new amount: ${existingItem.amount})`,
        );
      } else {
        // 없으면 새로 생성
        const newInventoryItem = inventoryRepository.create({
          walletAddress: TEST_WALLET_ADDRESS,
          itemId: item.itemId,
          amount: item.amount,
          isEquipped: false,
          lastSyncedAt: new Date(),
        });

        await inventoryRepository.save(newInventoryItem);
        console.log(`  ✅ Added Item ID ${item.itemId} x${item.amount}`);
      }
    }

    console.log('🎉 Test inventory restored successfully!');
  } catch (error) {
    console.error('❌ Restoration failed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// 스크립트 실행
if (require.main === module) {
  restoreTestInventory()
    .then(() => {
      console.log('🎉 Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

export default restoreTestInventory;
