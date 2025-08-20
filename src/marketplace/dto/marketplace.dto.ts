import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsPositive,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ItemType, ItemRarity, MarketplaceStatus } from '../../entities';

export class CreateMarketplaceItemDto {
  @ApiProperty({
    description: 'Item name',
    example: 'Turbo Engine V5',
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Item description',
    example: 'High-performance engine for advanced spaceships',
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Item type',
    enum: ItemType,
  })
  @IsEnum(ItemType)
  itemType: ItemType;

  @ApiProperty({
    description: 'Item rarity',
    enum: ItemRarity,
  })
  @IsEnum(ItemRarity)
  rarity: ItemRarity;

  @ApiProperty({
    description: 'Price in KAIA',
    example: 50.0,
  })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({
    description: 'NFT token ID (optional)',
    required: false,
    example: 'nft-12345',
  })
  @IsOptional()
  @IsString()
  nftTokenId?: string;

  @ApiProperty({
    description: 'Item attributes',
    required: false,
    example: {
      powerBoost: 25,
      engineBoost: 15,
      special: { fireResistance: true },
    },
  })
  @IsOptional()
  attributes?: {
    powerBoost?: number;
    fuelBoost?: number;
    engineBoost?: number;
    reinforcementBoost?: number;
    special?: Record<string, any>;
  };

  @ApiProperty({
    description: 'Item image URL',
    required: false,
    example: 'https://example.com/item-image.png',
  })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({
    description: 'Listing expiration date',
    required: false,
    example: '2024-12-31T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class GetMarketplaceItemsDto {
  @ApiProperty({
    description: 'Filter by item type',
    enum: ItemType,
    required: false,
  })
  @IsOptional()
  @IsEnum(ItemType)
  itemType?: ItemType;

  @ApiProperty({
    description: 'Filter by item rarity',
    enum: ItemRarity,
    required: false,
  })
  @IsOptional()
  @IsEnum(ItemRarity)
  rarity?: ItemRarity;

  @ApiProperty({
    description: 'Filter by marketplace status',
    enum: MarketplaceStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(MarketplaceStatus)
  status?: MarketplaceStatus;

  @ApiProperty({
    description: 'Minimum price filter',
    required: false,
    example: 10.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price filter',
    required: false,
    example: 1000.0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxPrice?: number;

  @ApiProperty({
    description: 'Sort by field',
    required: false,
    example: 'price',
  })
  @IsOptional()
  @IsString()
  sortBy?: 'price' | 'createdAt' | 'rarity' | 'viewCount';

  @ApiProperty({
    description: 'Sort order',
    required: false,
    example: 'asc',
  })
  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc';

  @ApiProperty({
    description: 'Search query',
    required: false,
    example: 'engine',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Number of items to return',
    minimum: 1,
    maximum: 100,
    default: 20,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiProperty({
    description: 'Number of items to skip',
    minimum: 0,
    default: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  skip?: number = 0;
}

export class PurchaseItemDto {
  @ApiProperty({
    description: 'Marketplace item ID to purchase',
    example: 'uuid-string',
  })
  @IsString()
  itemId: string;
}
