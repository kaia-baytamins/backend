import * as dotenv from 'dotenv';
import { createConnection } from 'mysql2/promise';

dotenv.config();

async function clearQuests() {
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

    // Check current quest count before deletion
    console.log('\n📊 Current state before deletion:');
    const [questsBefore] = await connection.execute(
      'SELECT COUNT(*) as count FROM quests',
    );
    const [userQuestsBefore] = await connection.execute(
      'SELECT COUNT(*) as count FROM user_quests',
    );

    console.log(`- Quests: ${(questsBefore as any[])[0].count}`);
    console.log(
      `- User quest progress: ${(userQuestsBefore as any[])[0].count}`,
    );

    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will permanently delete ALL quest data!');
    console.log('This includes:');
    console.log('- All quests from the quests table');
    console.log('- All user quest progress from the user_quests table');
    console.log('- This action cannot be undone!');

    // For safety, we won't auto-execute - require manual confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const answer = await new Promise<string>((resolve) => {
      rl.question(
        '\nDo you want to continue? Type "YES" to confirm: ',
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

    console.log('\n🗑️  Starting quest data deletion...');

    // Delete user quest progress first (due to foreign key constraints)
    console.log('Deleting user quest progress...');
    await connection.execute('DELETE FROM user_quests');

    // Delete all quests
    console.log('Deleting all quests...');
    await connection.execute('DELETE FROM quests');

    // Reset auto-increment counters
    console.log('Resetting auto-increment counters...');
    await connection.execute('ALTER TABLE user_quests AUTO_INCREMENT = 1');
    await connection.execute('ALTER TABLE quests AUTO_INCREMENT = 1');

    console.log('✅ Quest data deletion completed!');

    // Check final state
    console.log('\n📊 Final state after deletion:');
    const [questsAfter] = await connection.execute(
      'SELECT COUNT(*) as count FROM quests',
    );
    const [userQuestsAfter] = await connection.execute(
      'SELECT COUNT(*) as count FROM user_quests',
    );

    console.log(`- Quests: ${(questsAfter as any[])[0].count}`);
    console.log(
      `- User quest progress: ${(userQuestsAfter as any[])[0].count}`,
    );

    console.log('\n✨ All quest data has been successfully cleared!');
    console.log(
      '📱 The frontend quest tab should now show no quests when refreshed.',
    );
  } catch (error) {
    console.error('❌ Error during quest deletion:', error.message);
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
  clearQuests();
}

export { clearQuests };
