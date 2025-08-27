import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import {
  User,
  Pet,
  Spaceship,
  SpaceshipItem,
  Planet,
  ExplorationRecord,
  Quest,
  UserQuest,
  MarketplaceItem,
  Leaderboard,
  UserInventory,
} from '../entities';
import { Friendship } from '../entities/friendship.entity';
import { Invitation } from '../entities/invitation.entity';
import { UserStats } from '../entities/user-stats.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'uchumon',
  entities: [
    User,
    Pet,
    Spaceship,
    SpaceshipItem,
    Planet,
    ExplorationRecord,
    Quest,
    UserQuest,
    MarketplaceItem,
    Leaderboard,
    UserInventory,
    Friendship,
    Invitation,
    UserStats,
  ],
  synchronize: false,
  logging: false,
});

// 아이템 정보 매핑 (itemId별 이름과 등급)
const ITEM_INFO = {
  // 엔진 (0-15)
  0: { name: 'Basic Engine A', category: 'Engine', rarity: 'common' },
  1: { name: 'Basic Engine B', category: 'Engine', rarity: 'common' },
  2: { name: 'Basic Engine C', category: 'Engine', rarity: 'common' },
  3: { name: 'Basic Engine D', category: 'Engine', rarity: 'common' },
  4: { name: 'Basic Engine E', category: 'Engine', rarity: 'common' },
  5: { name: 'Basic Engine F', category: 'Engine', rarity: 'common' },
  6: { name: 'Advanced Engine A', category: 'Engine', rarity: 'rare' },
  7: { name: 'Advanced Engine B', category: 'Engine', rarity: 'rare' },
  8: { name: 'Advanced Engine C', category: 'Engine', rarity: 'rare' },
  9: { name: 'Advanced Engine D', category: 'Engine', rarity: 'rare' },
  10: { name: 'Epic Engine A', category: 'Engine', rarity: 'epic' },
  11: { name: 'Epic Engine B', category: 'Engine', rarity: 'epic' },
  12: { name: 'Epic Engine C', category: 'Engine', rarity: 'epic' },
  13: { name: 'Legendary Engine A', category: 'Engine', rarity: 'legendary' },
  14: { name: 'Legendary Engine B', category: 'Engine', rarity: 'legendary' },
  15: { name: 'Legendary Engine C', category: 'Engine', rarity: 'legendary' },

  // 재료 (16-31)
  16: { name: 'Iron Ore', category: 'Material', rarity: 'common' },
  17: { name: 'Copper Wire', category: 'Material', rarity: 'common' },
  18: { name: 'Steel Fragment', category: 'Material', rarity: 'common' },
  19: { name: 'Silicon Chip', category: 'Material', rarity: 'common' },
  20: { name: 'Carbon Fiber', category: 'Material', rarity: 'common' },
  21: { name: 'Aluminum Plate', category: 'Material', rarity: 'common' },
  22: { name: 'Rare Metal', category: 'Material', rarity: 'rare' },
  23: { name: 'Crystal Core', category: 'Material', rarity: 'rare' },
  24: { name: 'Energy Cell', category: 'Material', rarity: 'rare' },
  25: { name: 'Quantum Circuit', category: 'Material', rarity: 'rare' },
  26: { name: 'Mythril Ingot', category: 'Material', rarity: 'epic' },
  27: { name: 'Plasma Core', category: 'Material', rarity: 'epic' },
  28: { name: 'Dark Matter', category: 'Material', rarity: 'legendary' },
  29: { name: 'Void Crystal', category: 'Material', rarity: 'legendary' },
  30: { name: 'Time Fragment', category: 'Material', rarity: 'legendary' },
  31: { name: 'Space Essence', category: 'Material', rarity: 'legendary' },

  // 특수장비 (32-47)
  32: { name: 'Basic Shield', category: 'Special Equipment', rarity: 'common' },
  33: {
    name: 'Navigation System',
    category: 'Special Equipment',
    rarity: 'common',
  },
  34: { name: 'Repair Kit', category: 'Special Equipment', rarity: 'common' },
  35: {
    name: 'Scanner Device',
    category: 'Special Equipment',
    rarity: 'common',
  },
  36: {
    name: 'Communication Array',
    category: 'Special Equipment',
    rarity: 'common',
  },
  37: { name: 'Life Support', category: 'Special Equipment', rarity: 'common' },
  38: {
    name: 'Advanced Shield',
    category: 'Special Equipment',
    rarity: 'rare',
  },
  39: {
    name: 'Cloaking Device',
    category: 'Special Equipment',
    rarity: 'rare',
  },
  40: { name: 'Weapon System', category: 'Special Equipment', rarity: 'rare' },
  41: { name: 'Teleporter', category: 'Special Equipment', rarity: 'rare' },
  42: { name: 'Epic Shield', category: 'Special Equipment', rarity: 'epic' },
  43: {
    name: 'Gravity Generator',
    category: 'Special Equipment',
    rarity: 'epic',
  },
  44: {
    name: 'Legendary Shield',
    category: 'Special Equipment',
    rarity: 'legendary',
  },
  45: {
    name: 'Reality Anchor',
    category: 'Special Equipment',
    rarity: 'legendary',
  },
  46: {
    name: 'Dimensional Gate',
    category: 'Special Equipment',
    rarity: 'legendary',
  },
  47: {
    name: 'Universe Key',
    category: 'Special Equipment',
    rarity: 'legendary',
  },

  // 연료탱크 (48-63)
  48: { name: 'Small Fuel Tank', category: 'Fuel Tank', rarity: 'common' },
  49: { name: 'Basic Fuel Tank', category: 'Fuel Tank', rarity: 'common' },
  50: { name: 'Standard Fuel Tank', category: 'Fuel Tank', rarity: 'common' },
  51: { name: 'Large Fuel Tank', category: 'Fuel Tank', rarity: 'common' },
  52: { name: 'Extra Large Tank', category: 'Fuel Tank', rarity: 'common' },
  53: { name: 'Mega Fuel Tank', category: 'Fuel Tank', rarity: 'common' },
  54: { name: 'Advanced Tank A', category: 'Fuel Tank', rarity: 'rare' },
  55: { name: 'Advanced Tank B', category: 'Fuel Tank', rarity: 'rare' },
  56: { name: 'Advanced Tank C', category: 'Fuel Tank', rarity: 'rare' },
  57: { name: 'Advanced Tank D', category: 'Fuel Tank', rarity: 'rare' },
  58: { name: 'Epic Fuel Tank', category: 'Fuel Tank', rarity: 'epic' },
  59: { name: 'Epic Tank Plus', category: 'Fuel Tank', rarity: 'epic' },
  60: { name: 'Legendary Tank A', category: 'Fuel Tank', rarity: 'legendary' },
  61: { name: 'Legendary Tank B', category: 'Fuel Tank', rarity: 'legendary' },
  62: { name: 'Infinite Tank', category: 'Fuel Tank', rarity: 'legendary' },
  63: { name: 'Cosmic Tank', category: 'Fuel Tank', rarity: 'legendary' },
};

function getRarityEmoji(rarity: string): string {
  switch (rarity) {
    case 'common':
      return '⚪';
    case 'rare':
      return '🔵';
    case 'epic':
      return '🟣';
    case 'legendary':
      return '🟡';
    default:
      return '⚫';
  }
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'common':
      return '\x1b[37m'; // White
    case 'rare':
      return '\x1b[34m'; // Blue
    case 'epic':
      return '\x1b[35m'; // Magenta
    case 'legendary':
      return '\x1b[33m'; // Yellow
    default:
      return '\x1b[0m'; // Reset
  }
}

async function checkUserInventory(identifier?: string) {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();
    console.log('✅ Database connected!');

    const userRepository = AppDataSource.getRepository(User);
    const inventoryRepository = AppDataSource.getRepository(UserInventory);

    let users: User[] = [];

    if (identifier) {
      // 특정 사용자 조회 (username 또는 walletAddress)
      const user = await userRepository.findOne({
        where: [{ username: identifier }, { walletAddress: identifier }],
      });

      if (!user) {
        console.log(`❌ User not found: ${identifier}`);
        return;
      }
      users = [user];
    } else {
      // 모든 사용자 조회
      users = await userRepository.find();
    }

    console.log('\n📦 USER INVENTORY REPORT');
    console.log('='.repeat(80));

    for (const user of users) {
      const inventory = await inventoryRepository.find({
        where: { walletAddress: user.walletAddress },
        order: { itemId: 'ASC' },
      });

      console.log(`\n👤 User: ${user.username} (Level ${user.level})`);
      console.log(`💳 Wallet: ${user.walletAddress}`);
      console.log(`📈 Experience: ${user.experience}`);
      console.log('-'.repeat(60));

      if (inventory.length === 0) {
        console.log('  📭 No items in inventory');
        continue;
      }

      // 카테고리별로 그룹핑
      const itemsByCategory = inventory.reduce(
        (acc, item) => {
          const itemInfo = ITEM_INFO[item.itemId as keyof typeof ITEM_INFO];
          if (itemInfo) {
            if (!acc[itemInfo.category]) {
              acc[itemInfo.category] = [];
            }
            acc[itemInfo.category].push({ ...item, info: itemInfo });
          }
          return acc;
        },
        {} as Record<string, any[]>,
      );

      let totalItems = 0;
      Object.keys(itemsByCategory).forEach((category) => {
        console.log(`\n  📂 ${category}:`);

        itemsByCategory[category].forEach((item) => {
          const emoji = getRarityEmoji(item.info.rarity);
          const color = getRarityColor(item.info.rarity);
          const reset = '\x1b[0m';

          console.log(
            `    ${emoji} ${color}[${item.info.rarity.toUpperCase()}]${reset} ${item.info.name} x${item.amount}`,
          );
          totalItems += item.amount;
        });
      });

      console.log(`\n  📊 Total Items: ${totalItems}`);
      console.log(
        `  🕒 Last Synced: ${inventory[0]?.lastSyncedAt?.toLocaleString() || 'N/A'}`,
      );
    }

    console.log('\n' + '='.repeat(80));
    console.log('✨ Inventory check completed!');
  } catch (error) {
    console.error('❌ Error checking inventory:', error.message);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

// 실행 로직
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === '--help' || command === '-h') {
    console.log('📦 User Inventory Checker');
    console.log('\nUsage:');
    console.log('  pnpm check-inventory                    # Check all users');
    console.log(
      '  pnpm check-inventory [username]         # Check specific user by username',
    );
    console.log(
      '  pnpm check-inventory [wallet_address]   # Check specific user by wallet address',
    );
    console.log('\nExamples:');
    console.log('  pnpm check-inventory');
    console.log('  pnpm check-inventory "김민수"');
    console.log(
      '  pnpm check-inventory "0x1234567890123456789012345678901234567890"',
    );
    return;
  }

  const identifier = command;
  await checkUserInventory(identifier);
}

if (require.main === module) {
  main();
}

export { checkUserInventory };
