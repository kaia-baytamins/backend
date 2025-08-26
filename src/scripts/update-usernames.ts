import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { User } from '../entities';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'kaia_game',
  entities: [User],
  synchronize: false,
  logging: false,
});

const usernameUpdates = [
  { lineUserId: 'U1111111111111111111111111111111', newUsername: '김민수' },
  { lineUserId: 'U2222222222222222222222222222222', newUsername: '田中さくら' },
  { lineUserId: 'U3333333333333333333333333333333', newUsername: '이준호' },
  { lineUserId: 'U4444444444444444444444444444444', newUsername: '山田ひかり' },
  { lineUserId: 'U5555555555555555555555555555555', newUsername: '박소영' },
  { lineUserId: 'U6666666666666666666666666666666', newUsername: '佐藤ゆうき' },
  { lineUserId: 'U7777777777777777777777777777777', newUsername: '최현우' },
  { lineUserId: 'U8888888888888888888888888888888', newUsername: '鈴木まり' },
];

async function updateUsernames() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();

    const userRepository = AppDataSource.getRepository(User);

    console.log('📝 Updating usernames...');

    for (const update of usernameUpdates) {
      await userRepository.update(
        { lineUserId: update.lineUserId },
        { username: update.newUsername },
      );
      console.log(`✅ Updated: ${update.lineUserId} → ${update.newUsername}`);
    }

    console.log('🎉 All usernames updated successfully!');
  } catch (error) {
    console.error('❌ Error updating usernames:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

updateUsernames();
