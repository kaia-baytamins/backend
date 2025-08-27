import * as dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'kaia_game',
  entities: [],
  synchronize: false,
  logging: true,
});

async function addOwnedNFTsColumn() {
  try {
    console.log('🔌 Connecting to database...');
    await AppDataSource.initialize();

    console.log('✅ Database connected!');

    // Check if column exists first
    const columnExists = await AppDataSource.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'users' 
        AND COLUMN_NAME = 'ownedNFTs'
    `);

    console.log('Column check result:', columnExists);

    if (columnExists[0].count === 0) {
      console.log('Adding ownedNFTs column...');
      await AppDataSource.query(
        'ALTER TABLE users ADD COLUMN ownedNFTs json NULL',
      );
      console.log('✅ ownedNFTs column added successfully!');
    } else {
      console.log('⚠️ ownedNFTs column already exists');
    }
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

addOwnedNFTsColumn();
