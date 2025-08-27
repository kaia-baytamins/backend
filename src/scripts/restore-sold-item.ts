import { DataSource } from 'typeorm';
import { UserInventory } from '../entities/user-inventory.entity';
import { AppDataSource } from '../../ormconfig';

async function restoreSoldItem() {
  const dataSource = AppDataSource;

  try {
    await dataSource.initialize();
    console.log('✅ Database connected');

    const inventoryRepository = dataSource.getRepository(UserInventory);

    // 테스트용 지갑 주소
    const testWalletAddress = '0x1234567890123456789012345678901234567890';

    // 기본 엔진 MK-2 (itemId = 1) 복구
    const newInventoryItem = inventoryRepository.create({
      walletAddress: testWalletAddress,
      itemId: 1, // 기본 엔진 MK-2
      amount: 1,
      isEquipped: false,
      lastSyncedAt: new Date(),
    });

    await inventoryRepository.save(newInventoryItem);

    console.log('✅ 아이템 복구 완료:', {
      walletAddress: testWalletAddress,
      itemId: 1,
      itemName: '기본 엔진 MK-2',
      amount: 1,
    });
  } catch (error) {
    console.error('❌ 복구 실패:', error);
  } finally {
    await dataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// 스크립트 실행
if (require.main === module) {
  restoreSoldItem()
    .then(() => {
      console.log('🎉 스크립트 실행 완료');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 스크립트 실행 실패:', error);
      process.exit(1);
    });
}

export default restoreSoldItem;
