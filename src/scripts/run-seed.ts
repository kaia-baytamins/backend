import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';
import { seedDummyUsers } from './seed-dummy-users';
import { seedInventory } from './seed-inventory';
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

    console.log('✅ Database connected!');
    await seedDummyUsers(AppDataSource);
    await seedInventory(AppDataSource);
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

main();
