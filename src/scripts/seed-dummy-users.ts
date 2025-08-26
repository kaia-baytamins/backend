import { DataSource } from 'typeorm';
import { User, Pet, Spaceship, PetType, SpaceshipType } from '../entities';
import { UserStats } from '../entities/user-stats.entity';

const dummyUsers = [
  {
    lineUserId: 'U1111111111111111111111111111111',
    username: '김민수',
    walletAddress: '0x1234567890123456789012345678901234567890',
    level: 5,
    experience: 1250,
    totalExplorations: 25,
    successfulExplorations: 20,
    petType: PetType.MOMOCO,
  },
  {
    lineUserId: 'U2222222222222222222222222222222',
    username: '田中さくら',
    walletAddress: '0x2345678901234567890123456789012345678901',
    level: 8,
    experience: 3200,
    totalExplorations: 50,
    successfulExplorations: 45,
    petType: PetType.PANLULU,
  },
  {
    lineUserId: 'U3333333333333333333333333333333',
    username: '이준호',
    walletAddress: '0x3456789012345678901234567890123456789012',
    level: 3,
    experience: 750,
    totalExplorations: 15,
    successfulExplorations: 12,
    petType: PetType.HOSHITANU,
  },
  {
    lineUserId: 'U4444444444444444444444444444444',
    username: '山田ひかり',
    walletAddress: '0x4567890123456789012345678901234567890123',
    level: 10,
    experience: 5000,
    totalExplorations: 100,
    successfulExplorations: 85,
    petType: PetType.MIZURU,
  },
  {
    lineUserId: 'U5555555555555555555555555555555',
    username: '박소영',
    walletAddress: '0x5678901234567890123456789012345678901234',
    level: 6,
    experience: 1800,
    totalExplorations: 35,
    successfulExplorations: 28,
    petType: PetType.MOMOCO,
  },
  {
    lineUserId: 'U6666666666666666666666666666666',
    username: '佐藤ゆうき',
    walletAddress: '0x6789012345678901234567890123456789012345',
    level: 4,
    experience: 1000,
    totalExplorations: 20,
    successfulExplorations: 16,
    petType: PetType.PANLULU,
  },
  {
    lineUserId: 'U7777777777777777777777777777777',
    username: '최현우',
    walletAddress: '0x7890123456789012345678901234567890123456',
    level: 7,
    experience: 2400,
    totalExplorations: 40,
    successfulExplorations: 35,
    petType: PetType.HOSHITANU,
  },
  {
    lineUserId: 'U8888888888888888888888888888888',
    username: '鈴木まり',
    walletAddress: '0x8901234567890123456789012345678901234567',
    level: 2,
    experience: 400,
    totalExplorations: 8,
    successfulExplorations: 6,
    petType: PetType.MIZURU,
  },
];

const petNames = {
  [PetType.MOMOCO]: 'Momoco',
  [PetType.PANLULU]: 'Panlulu',
  [PetType.HOSHITANU]: 'Hoshitanu',
  [PetType.MIZURU]: 'Mizuru',
};

export async function seedDummyUsers(dataSource: DataSource) {
  const userRepository = dataSource.getRepository(User);
  const petRepository = dataSource.getRepository(Pet);
  const spaceshipRepository = dataSource.getRepository(Spaceship);
  const userStatsRepository = dataSource.getRepository(UserStats);

  console.log('🌱 Starting to seed dummy users...');

  for (const userData of dummyUsers) {
    // Check if user already exists
    const existingUser = await userRepository.findOne({
      where: { lineUserId: userData.lineUserId },
    });

    if (existingUser) {
      console.log(`👤 User ${userData.username} already exists, skipping...`);
      continue;
    }

    // Create user
    const user = userRepository.create({
      lineUserId: userData.lineUserId,
      username: userData.username,
      walletAddress: userData.walletAddress,
      level: userData.level,
      experience: userData.experience,
      totalExplorations: userData.totalExplorations,
      successfulExplorations: userData.successfulExplorations,
      lastLoginAt: new Date(),
    });

    const savedUser = await userRepository.save(user);

    // Create pet
    const pet = petRepository.create({
      name: petNames[userData.petType],
      type: userData.petType,
      level: Math.floor(userData.level / 2) + 1,
      health: 100 + userData.level * 10,
      maxHealth: 100 + userData.level * 10,
      agility: 50 + userData.level * 5,
      intelligence: 50 + userData.level * 5,
      experience: userData.experience / 2,
      ownerId: savedUser.id,
    });

    // Create spaceship
    const spaceship = spaceshipRepository.create({
      name: `Explorer ${userData.level}`,
      type: SpaceshipType.BASIC,
      level: userData.level,
      engine: 100 + userData.level * 15,
      fuel: 100 + userData.level * 10,
      reinforcement: 50 + userData.level * 8,
      ownerId: savedUser.id,
    });

    // Create user stats
    const stats = userStatsRepository.create({
      userId: savedUser.id,
    });

    await Promise.all([
      petRepository.save(pet),
      spaceshipRepository.save(spaceship),
      userStatsRepository.save(stats),
    ]);

    console.log(
      `✅ Created user: ${userData.username} (Level ${userData.level})`,
    );
  }

  console.log('🎉 Dummy users seeded successfully!');
}
