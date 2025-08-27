import * as dotenv from 'dotenv';
import { createConnection } from 'mysql2/promise';

dotenv.config();

const questsData = [
  // ====================== DAILY QUESTS ======================
  {
    title: '🚀 우주선 정비 점검',
    description: 'UchuMon 앱에 접속하여 우주선 상태를 점검하세요',
    type: 'daily',
    category: 'social',
    requirements: {
      action: 'app_login',
      amount: 1,
      target: 'daily_login',
    },
    rewards: {
      items: [
        { type: 'food', rarity: 'common', name: '캐릭터 사료' },
        { type: 'toy', rarity: 'common', name: '캐릭터 장난감' },
      ],
    },
    levelRequirement: 0,
    maxCompletions: 1,
    sortOrder: 1,
  },
  {
    title: '🍖 우주 동반자 급식',
    description: '나의 캐릭터에게 맛있는 사료를 줘서 체력 증가시키기',
    type: 'daily',
    category: 'pet_care',
    requirements: {
      action: 'feed_pet',
      amount: 1,
      target: 'pet_health',
    },
    rewards: {
      items: [{ type: 'equipment', rarity: 'common', name: '기본 등급 장비' }],
    },
    levelRequirement: 0,
    maxCompletions: 1,
    sortOrder: 2,
  },
  {
    title: '⚡ 파트너 훈련 세션',
    description:
      '나의 캐릭터를 장난감으로 1회 훈련시켜서 민첩성 또는 지능 증가시키기',
    type: 'daily',
    category: 'pet_care',
    requirements: {
      action: 'train_pet',
      amount: 1,
      target: 'pet_stats',
    },
    rewards: {
      items: [{ type: 'equipment', rarity: 'common', name: '기본 등급 장비' }],
    },
    levelRequirement: 0,
    maxCompletions: 1,
    sortOrder: 3,
  },
  {
    title: '🌍 신세계 발견',
    description: '아무 행성이나 1회 탐험을 보내서 새로운 발견을 하세요',
    type: 'daily',
    category: 'exploration',
    requirements: {
      action: 'explore_planet',
      amount: 1,
      target: 'exploration_count',
    },
    rewards: {
      items: [{ type: 'equipment', rarity: 'common', name: '기본 등급 장비' }],
    },
    levelRequirement: 0,
    maxCompletions: 1,
    sortOrder: 4,
  },
  {
    title: '💎 에너지 크리스탈 채굴',
    description:
      '스테이킹, LP제공, 렌딩 3개의 DeFi 중 1개에 참여하여 에너지를 얻으세요',
    type: 'daily',
    category: 'staking',
    requirements: {
      action: 'defi_participate',
      amount: 1,
      target: 'any_defi',
      conditions: {
        options: ['staking', 'lp_providing', 'lending'],
      },
    },
    rewards: {
      items: [{ type: 'equipment', rarity: 'common', name: '기본 등급 장비' }],
    },
    levelRequirement: 0,
    maxCompletions: 1,
    sortOrder: 5,
  },

  // ====================== WEEKLY QUESTS ======================
  {
    title: '⛏️ 장기 크리스탈 채굴 프로젝트',
    description:
      '선택한 DeFi 옵션을 7일간 유지하여 안정적인 에너지를 확보하세요',
    type: 'weekly',
    category: 'staking',
    requirements: {
      action: 'maintain_defi',
      amount: 10, // $10 이상
      duration: 168, // 7일 = 168시간
      target: 'defi_value',
      conditions: {
        options: ['staking', 'lp_providing', 'lending'],
        minimum_usd_value: 10,
      },
    },
    rewards: {
      items: [{ type: 'equipment', rarity: 'rare', name: '희귀 등급 장비' }],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 1,
  },
  {
    title: '🛒 우주 상점가 단골손님',
    description:
      '마켓에서 총 10회 이상의 거래를 완료하여 상인들과 친분을 쌓으세요',
    type: 'weekly',
    category: 'trading',
    requirements: {
      action: 'market_transactions',
      amount: 10,
      target: 'transaction_count',
    },
    rewards: {
      items: [{ type: 'equipment', rarity: 'rare', name: '희귀 등급 장비' }],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 2,
  },
  {
    title: '💰 우주 무역상 입문',
    description:
      '마켓에서 총 50 KAIA 이상의 거래를 완료하여 무역상으로서 첫걸음을 내딛으세요',
    type: 'weekly',
    category: 'trading',
    requirements: {
      action: 'market_volume',
      amount: 50,
      target: 'kaia_volume',
    },
    rewards: {
      items: [{ type: 'equipment', rarity: 'rare', name: '희귀 등급 장비' }],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 3,
  },
  {
    title: '🗺️ 별자리 정복자',
    description: '아무 행성이나 10회 탐험을 보내서 별자리 지도를 완성하세요',
    type: 'weekly',
    category: 'exploration',
    requirements: {
      action: 'explore_planets',
      amount: 10,
      target: 'exploration_count',
    },
    rewards: {
      items: [
        { type: 'equipment', rarity: 'rare-epic', name: '희귀-에픽 등급 장비' },
      ],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 4,
  },

  // ====================== SPECIAL QUESTS ======================
  {
    title: '👑 크리스탈 마이닝 마스터',
    description:
      '선택한 DeFi 전략을 30일간 유지하여 크리스탈 채굴의 달인이 되세요',
    type: 'special',
    category: 'staking',
    requirements: {
      action: 'maintain_defi',
      amount: 10,
      duration: 720, // 30일 = 720시간
      target: 'defi_value',
      conditions: {
        options: ['staking', 'lp_providing', 'lending'],
        minimum_usd_value: 10,
      },
    },
    rewards: {
      items: [
        { type: 'equipment', rarity: 'epic', name: '에픽 등급 장비' },
        { type: 'equipment', rarity: 'epic', name: '에픽 등급 장비' },
      ],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 1,
  },
  {
    title: '✨ 우주 미스터리 사냥꾼',
    description:
      '탐험 중 신비로운 이벤트를 30회 이상 발견하여 우주의 비밀을 풀어내세요',
    type: 'special',
    category: 'exploration',
    requirements: {
      action: 'exploration_events',
      amount: 30,
      target: 'event_count',
    },
    rewards: {
      items: [
        { type: 'equipment', rarity: 'epic', name: '에픽 등급 장비' },
        { type: 'equipment', rarity: 'epic', name: '에픽 등급 장비' },
      ],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 2,
  },

  // ====================== LEGENDARY QUESTS ======================
  {
    title: '🌌 은하계 에너지 제국',
    description:
      '선택한 DeFi 전략을 90일간 유지하여 은하계 최고의 에너지 제국을 건설하세요',
    type: 'legendary',
    category: 'staking',
    requirements: {
      action: 'maintain_defi',
      amount: 10,
      duration: 2160, // 90일 = 2160시간
      target: 'defi_value',
      conditions: {
        options: ['staking', 'lp_providing', 'lending'],
        minimum_usd_value: 10,
      },
    },
    rewards: {
      items: [
        { type: 'equipment', rarity: 'legendary', name: '레전더리 등급 장비' },
      ],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 1,
  },
  {
    title: '🏆 우주 정복 완료',
    description: '모든 행성을 1회 이상 탐험하여 진정한 우주 정복자가 되세요',
    type: 'legendary',
    category: 'exploration',
    requirements: {
      action: 'explore_all_planets',
      amount: 1,
      target: 'complete_exploration',
    },
    rewards: {
      items: [
        { type: 'equipment', rarity: 'legendary', name: '레전더리 등급 장비' },
      ],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 2,
  },
  {
    title: '👥 은하연합 창립자',
    description: '친구 10명 이상을 초대하여 은하연합의 창립자가 되세요',
    type: 'legendary',
    category: 'social',
    requirements: {
      action: 'invite_friends',
      amount: 10,
      target: 'invitation_count',
    },
    rewards: {
      items: [
        { type: 'equipment', rarity: 'legendary', name: '레전더리 등급 장비' },
      ],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 3,
  },
  {
    title: '📈 우주 상거래 전설',
    description:
      '마켓에서 총 100회 이상의 거래를 완료하여 상거래의 전설이 되세요',
    type: 'legendary',
    category: 'trading',
    requirements: {
      action: 'market_transactions',
      amount: 100,
      target: 'transaction_count',
    },
    rewards: {
      items: [
        {
          type: 'equipment',
          rarity: 'epic-legendary',
          name: '에픽-레전더리 등급 장비',
        },
      ],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 4,
  },
  {
    title: '💎 은하계 재벌',
    description:
      '마켓에서 총 1000 KAIA 이상의 거래를 완료하여 은하계 최고의 재벌이 되세요',
    type: 'legendary',
    category: 'trading',
    requirements: {
      action: 'market_volume',
      amount: 1000,
      target: 'kaia_volume',
    },
    rewards: {
      items: [
        {
          type: 'equipment',
          rarity: 'epic-legendary',
          name: '에픽-레전더리 등급 장비',
        },
      ],
    },
    levelRequirement: 1,
    maxCompletions: 1,
    sortOrder: 5,
  },
];

async function seedQuests() {
  let connection;

  try {
    console.log('🔌 Connecting to database...');

    connection = await createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT, 10) || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'uchumon',
    });

    console.log('✅ Database connected!');

    // Check if quests already exist
    console.log('\n📊 Checking existing quest data...');
    const [existingQuests] = await connection.execute(
      'SELECT COUNT(*) as count FROM quests',
    );
    const existingCount = (existingQuests as any[])[0].count;

    if (existingCount > 0) {
      console.log(`⚠️  Found ${existingCount} existing quests in database`);

      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question(
          'Do you want to clear existing quests and add new ones? Type "YES" to confirm: ',
          (answer) => {
            rl.close();
            resolve(answer);
          },
        );
      });

      if (answer !== 'YES') {
        console.log('❌ Operation cancelled by user');
        return;
      }

      // Clear existing quests and user quest progress
      console.log('🗑️  Clearing existing quest data...');
      await connection.execute('DELETE FROM user_quests');
      await connection.execute('DELETE FROM quests');
      await connection.execute('ALTER TABLE user_quests AUTO_INCREMENT = 1');
      await connection.execute('ALTER TABLE quests AUTO_INCREMENT = 1');
    }

    console.log('📝 Inserting new quest data...');

    // Prepare insert statement
    const insertQuery = `
      INSERT INTO quests (
        id, title, description, type, category, requirements, rewards, 
        maxCompletions, stakingRequirement, levelRequirement, isActive, 
        sortOrder, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `;

    let insertedCount = 0;

    for (const quest of questsData) {
      const questId = require('uuid').v4();

      await connection.execute(insertQuery, [
        questId,
        quest.title,
        quest.description,
        quest.type,
        quest.category,
        JSON.stringify(quest.requirements),
        JSON.stringify(quest.rewards),
        quest.maxCompletions,
        0, // stakingRequirement
        quest.levelRequirement,
        true, // isActive
        quest.sortOrder,
      ]);

      insertedCount++;
      console.log(`  ✅ ${quest.type.toUpperCase()}: ${quest.title}`);
    }

    console.log(`\n🎉 Successfully inserted ${insertedCount} quests!`);

    // Show final statistics
    console.log('\n📊 Quest Statistics:');
    const [dailyCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM quests WHERE type = "daily"',
    );
    const [weeklyCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM quests WHERE type = "weekly"',
    );
    const [specialCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM quests WHERE type = "special"',
    );
    const [legendaryCount] = await connection.execute(
      'SELECT COUNT(*) as count FROM quests WHERE type = "legendary"',
    );

    console.log(`- Daily quests: ${(dailyCount as any[])[0].count}`);
    console.log(`- Weekly quests: ${(weeklyCount as any[])[0].count}`);
    console.log(`- Special quests: ${(specialCount as any[])[0].count}`);
    console.log(`- Legendary quests: ${(legendaryCount as any[])[0].count}`);
    console.log(`- Total: ${insertedCount} quests`);

    console.log('\n✨ Quest seeding completed successfully!');
    console.log(
      '🌐 Your frontend should now display these quests when refreshed.',
    );
  } catch (error) {
    console.error('❌ Error during quest seeding:', error.message);
    console.log(
      '\n💡 Make sure your database is running and credentials are correct in .env file',
    );
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run the script
if (require.main === module) {
  seedQuests();
}

export { seedQuests };
