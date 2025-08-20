import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  MarketplaceItem,
  MarketplaceStatus,
  User,
  SpaceshipItem,
} from '../entities';
import { BlockchainService } from '../blockchain/blockchain.service';
import {
  CreateMarketplaceItemDto,
  GetMarketplaceItemsDto,
} from './dto/marketplace.dto';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);

  constructor(
    @InjectRepository(MarketplaceItem)
    private readonly marketplaceRepository: Repository<MarketplaceItem>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SpaceshipItem)
    private readonly spaceshipItemRepository: Repository<SpaceshipItem>,
    private readonly blockchainService: BlockchainService,
  ) {}

  /**
   * Get marketplace items with filters
   */
  async getMarketplaceItems(filters: GetMarketplaceItemsDto): Promise<{
    items: MarketplaceItem[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const queryBuilder = this.marketplaceRepository
      .createQueryBuilder('item')
      .leftJoinAndSelect('item.seller', 'seller')
      .where('item.status = :status', {
        status: filters.status || MarketplaceStatus.ACTIVE,
      });

    // Apply filters
    if (filters.itemType) {
      queryBuilder.andWhere('item.itemType = :itemType', {
        itemType: filters.itemType,
      });
    }

    if (filters.rarity) {
      queryBuilder.andWhere('item.rarity = :rarity', {
        rarity: filters.rarity,
      });
    }

    if (filters.minPrice !== undefined) {
      queryBuilder.andWhere('item.price >= :minPrice', {
        minPrice: filters.minPrice,
      });
    }

    if (filters.maxPrice !== undefined) {
      queryBuilder.andWhere('item.price <= :maxPrice', {
        maxPrice: filters.maxPrice,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(item.name ILIKE :search OR item.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Only show non-expired items
    queryBuilder.andWhere('item.expiresAt > :now', { now: new Date() });

    // Apply sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = (filters.sortOrder || 'desc').toUpperCase() as
      | 'ASC'
      | 'DESC';
    queryBuilder.orderBy(`item.${sortBy}`, sortOrder);

    // Apply pagination
    const skip = filters.skip || 0;
    const limit = filters.limit || 20;
    queryBuilder.skip(skip).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get marketplace item by ID
   */
  async getMarketplaceItem(itemId: string): Promise<MarketplaceItem> {
    const item = await this.marketplaceRepository.findOne({
      where: { id: itemId },
      relations: ['seller', 'buyer'],
    });

    if (!item) {
      throw new NotFoundException('Marketplace item not found');
    }

    // Increment view count
    item.viewCount += 1;
    await this.marketplaceRepository.save(item);

    return item;
  }

  /**
   * List item for sale
   */
  async listItem(
    sellerId: string,
    createDto: CreateMarketplaceItemDto,
  ): Promise<MarketplaceItem> {
    const seller = await this.userRepository.findOne({
      where: { id: sellerId },
    });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    // Set default expiration to 30 days if not provided
    const expiresAt = createDto.expiresAt
      ? new Date(createDto.expiresAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const marketplaceItem = this.marketplaceRepository.create({
      ...createDto,
      sellerId,
      expiresAt,
      status: MarketplaceStatus.ACTIVE,
    });

    const savedItem = await this.marketplaceRepository.save(marketplaceItem);

    this.logger.log(`Item ${savedItem.id} listed by user ${sellerId}`);

    return savedItem;
  }

  /**
   * Purchase item
   */
  async purchaseItem(
    buyerId: string,
    itemId: string,
  ): Promise<{
    success: boolean;
    transactionHash?: string;
    item: MarketplaceItem;
  }> {
    const buyer = await this.userRepository.findOne({ where: { id: buyerId } });
    if (!buyer) {
      throw new NotFoundException('Buyer not found');
    }

    const item = await this.marketplaceRepository.findOne({
      where: { id: itemId },
      relations: ['seller'],
    });

    if (!item) {
      throw new NotFoundException('Marketplace item not found');
    }

    if (item.sellerId === buyerId) {
      throw new BadRequestException('Cannot buy your own item');
    }

    if (!item.isAvailable) {
      throw new BadRequestException('Item is not available for purchase');
    }

    try {
      // Check buyer's balance
      const buyerBalance = await this.blockchainService.getBalance(
        buyer.walletAddress,
      );
      const requiredAmount = this.blockchainService.parseKaia(
        item.price.toString(),
      );

      if (this.blockchainService.parseKaia(buyerBalance) < requiredAmount) {
        throw new BadRequestException('Insufficient balance');
      }

      // In a real implementation, this would:
      // 1. Transfer KAIA from buyer to seller
      // 2. Transfer NFT from seller to buyer (if applicable)
      // 3. Update marketplace item status

      // For now, simulate the transaction
      const transactionHash = `0x${Math.random().toString(16).substr(2, 64)}`;

      // Update item status
      item.status = MarketplaceStatus.SOLD;
      item.buyerId = buyerId;
      item.soldAt = new Date();

      await this.marketplaceRepository.save(item);

      // Create spaceship item for buyer if applicable
      if (item.nftTokenId) {
        await this.createSpaceshipItemForBuyer(buyerId, item);
      }

      this.logger.log(`Item ${itemId} purchased by user ${buyerId}`);

      return {
        success: true,
        transactionHash,
        item,
      };
    } catch (error) {
      this.logger.error(`Error purchasing item ${itemId}:`, error);
      throw new BadRequestException(`Purchase failed: ${error.message}`);
    }
  }

  /**
   * Cancel item listing
   */
  async cancelListing(
    sellerId: string,
    itemId: string,
  ): Promise<MarketplaceItem> {
    const item = await this.marketplaceRepository.findOne({
      where: { id: itemId, sellerId },
    });

    if (!item) {
      throw new NotFoundException(
        'Marketplace item not found or not owned by user',
      );
    }

    if (item.status !== MarketplaceStatus.ACTIVE) {
      throw new BadRequestException('Only active listings can be cancelled');
    }

    item.status = MarketplaceStatus.CANCELLED;
    const updatedItem = await this.marketplaceRepository.save(item);

    this.logger.log(`Item ${itemId} listing cancelled by user ${sellerId}`);

    return updatedItem;
  }

  /**
   * Get user's marketplace items
   */
  async getUserMarketplaceItems(
    userId: string,
    type: 'selling' | 'sold' | 'purchased' = 'selling',
  ): Promise<MarketplaceItem[]> {
    const queryBuilder = this.marketplaceRepository.createQueryBuilder('item');

    switch (type) {
      case 'selling':
        queryBuilder
          .where('item.sellerId = :userId', { userId })
          .andWhere('item.status = :status', {
            status: MarketplaceStatus.ACTIVE,
          });
        break;
      case 'sold':
        queryBuilder
          .where('item.sellerId = :userId', { userId })
          .andWhere('item.status = :status', {
            status: MarketplaceStatus.SOLD,
          });
        break;
      case 'purchased':
        queryBuilder
          .where('item.buyerId = :userId', { userId })
          .andWhere('item.status = :status', {
            status: MarketplaceStatus.SOLD,
          });
        break;
    }

    queryBuilder
      .leftJoinAndSelect('item.seller', 'seller')
      .leftJoinAndSelect('item.buyer', 'buyer')
      .orderBy('item.createdAt', 'DESC');

    return await queryBuilder.getMany();
  }

  /**
   * Get marketplace statistics
   */
  async getMarketplaceStats(): Promise<{
    totalItems: number;
    activeItems: number;
    totalVolume: number;
    averagePrice: number;
    categoryStats: Record<string, number>;
    rarityStats: Record<string, number>;
  }> {
    const [totalItems, activeItems] = await Promise.all([
      this.marketplaceRepository.count(),
      this.marketplaceRepository.count({
        where: { status: MarketplaceStatus.ACTIVE },
      }),
    ]);

    const soldItems = await this.marketplaceRepository.find({
      where: { status: MarketplaceStatus.SOLD },
    });

    const totalVolume = soldItems.reduce(
      (sum, item) => sum + Number(item.price),
      0,
    );
    const averagePrice =
      soldItems.length > 0 ? totalVolume / soldItems.length : 0;

    // Get category and rarity statistics
    const categoryStats = await this.marketplaceRepository
      .createQueryBuilder('item')
      .select('item.itemType', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('item.status = :status', { status: MarketplaceStatus.ACTIVE })
      .groupBy('item.itemType')
      .getRawMany();

    const rarityStats = await this.marketplaceRepository
      .createQueryBuilder('item')
      .select('item.rarity', 'rarity')
      .addSelect('COUNT(*)', 'count')
      .where('item.status = :status', { status: MarketplaceStatus.ACTIVE })
      .groupBy('item.rarity')
      .getRawMany();

    return {
      totalItems,
      activeItems,
      totalVolume,
      averagePrice,
      categoryStats: categoryStats.reduce((acc, stat) => {
        acc[stat.type] = parseInt(stat.count);
        return acc;
      }, {}),
      rarityStats: rarityStats.reduce((acc, stat) => {
        acc[stat.rarity] = parseInt(stat.count);
        return acc;
      }, {}),
    };
  }

  /**
   * Add item to favorites
   */
  async addToFavorites(userId: string, itemId: string): Promise<void> {
    const item = await this.marketplaceRepository.findOne({
      where: { id: itemId },
    });
    if (!item) {
      throw new NotFoundException('Marketplace item not found');
    }

    // In a real implementation, this would use a favorites table
    // For now, just increment the favorite count
    item.favoriteCount += 1;
    await this.marketplaceRepository.save(item);

    this.logger.log(`Item ${itemId} added to favorites by user ${userId}`);
  }

  /**
   * Create spaceship item for buyer after purchase
   */
  private async createSpaceshipItemForBuyer(
    buyerId: string,
    marketplaceItem: MarketplaceItem,
  ): Promise<void> {
    const buyer = await this.userRepository.findOne({
      where: { id: buyerId },
      relations: ['spaceship'],
    });

    if (!buyer?.spaceship) {
      this.logger.warn(`Buyer ${buyerId} does not have a spaceship`);
      return;
    }

    const attributes = marketplaceItem.attributes || {};

    const spaceshipItem = this.spaceshipItemRepository.create({
      name: marketplaceItem.name,
      description: marketplaceItem.description,
      type: marketplaceItem.itemType,
      rarity: marketplaceItem.rarity,
      powerBoost: attributes.powerBoost || 0,
      fuelBoost: attributes.fuelBoost || 0,
      engineBoost: attributes.engineBoost || 0,
      reinforcementBoost: attributes.reinforcementBoost || 0,
      nftTokenId: marketplaceItem.nftTokenId,
      spaceshipId: buyer.spaceship.id,
      isEquipped: false,
    });

    await this.spaceshipItemRepository.save(spaceshipItem);

    this.logger.log(
      `Spaceship item created for buyer ${buyerId} from marketplace item ${marketplaceItem.id}`,
    );
  }
}
