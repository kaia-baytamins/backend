import * as dotenv from 'dotenv';
import { createConnection } from 'mysql2/promise';

dotenv.config();

async function viewQuests() {
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

    // Check if quests table exists
    const [tableExists] = await connection.execute(
      `
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = ? AND table_name = 'quests'
    `,
      [process.env.DB_DATABASE || 'uchumon'],
    );

    if ((tableExists as any[])[0].count === 0) {
      console.log('❌ Quests table does not exist');
      return;
    }

    // Get table structure
    console.log('\n📋 Quests table structure:');
    const [columns] = await connection.execute('DESCRIBE quests');
    console.table(columns);

    // Get all quests
    console.log('\n📊 All quests in database:');
    const [quests] = await connection.execute(
      'SELECT * FROM quests ORDER BY createdAt DESC',
    );

    if ((quests as any[]).length === 0) {
      console.log('ℹ️  No quests found in database');
    } else {
      console.log(`Found ${(quests as any[]).length} quests:`);
      (quests as any[]).forEach((quest, index) => {
        console.log(`\n${index + 1}. ${quest.title || 'No Title'}`);
        console.log(`   ID: ${quest.id}`);
        console.log(`   Type: ${quest.type}`);
        console.log(`   Category: ${quest.category}`);
        console.log(`   Description: ${quest.description || 'No Description'}`);
        console.log(`   Available: ${quest.isAvailable}`);
        console.log(`   Level Requirement: ${quest.levelRequirement}`);
        console.log(`   Rewards: ${JSON.stringify(quest.rewards)}`);
        console.log(`   Requirements: ${JSON.stringify(quest.requirements)}`);
        console.log(`   Created: ${quest.createdAt}`);
        console.log('   ---');
      });
    }

    // Get user quests if any
    console.log('\n👤 User quest progress:');
    const [userQuests] = await connection.execute(
      'SELECT * FROM user_quests ORDER BY createdAt DESC',
    );

    if ((userQuests as any[]).length === 0) {
      console.log('ℹ️  No user quest progress found');
    } else {
      console.log(`Found ${(userQuests as any[]).length} user quest records:`);
      (userQuests as any[]).forEach((uq, index) => {
        console.log(
          `${index + 1}. User: ${uq.userId}, Quest: ${uq.questId}, Status: ${uq.status}, Progress: ${uq.progress}/${uq.targetAmount}`,
        );
      });
    }

    // Check for problematic data
    console.log('\n🔍 Checking for data issues...');

    try {
      const [typeCheck] = await connection.execute(`
        SELECT type, COUNT(*) as count 
        FROM quests 
        GROUP BY type
      `);
      console.log('Quest types in database:');
      console.table(typeCheck);
    } catch (error) {
      console.log('❌ Error checking quest types:', error.message);
    }

    try {
      const [categoryCheck] = await connection.execute(`
        SELECT category, COUNT(*) as count 
        FROM quests 
        GROUP BY category
      `);
      console.log('Quest categories in database:');
      console.table(categoryCheck);
    } catch (error) {
      console.log('❌ Error checking quest categories:', error.message);
    }
  } catch (error) {
    console.error('❌ Database connection error:', error.message);
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
  viewQuests();
}

export { viewQuests };
