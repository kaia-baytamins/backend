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
} from '../entities';
import { Friendship } from '../entities/friendship.entity';
import { UserStats } from '../entities/user-stats.entity';
import { Invitation } from '../entities/invitation.entity';
import { UserInventory } from '../entities/user-inventory.entity';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'kaia_game',
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
    Friendship,
    UserStats,
    Invitation,
    UserInventory,
  ],
  synchronize: false,
  logging: false,
});

async function main() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();

    const userRepository = AppDataSource.getRepository(User);
    const planetRepository = AppDataSource.getRepository(Planet);

    console.log('✅ Database connected!');
    console.log(
      '📊 Since database columns are not available, test the API directly with hardcoded data!',
    );
  } catch (error) {
    console.error('❌ Error seeding NFT data:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

main();
