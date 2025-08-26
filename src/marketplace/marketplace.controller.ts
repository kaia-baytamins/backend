import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';

import { MarketplaceService } from './marketplace.service';
import {
  CreateMarketplaceItemDto,
  GetMarketplaceItemsDto,
} from './dto/marketplace.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Marketplace')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly marketplaceService: MarketplaceService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get marketplace items',
    description:
      'Retrieve marketplace items with filtering, sorting, and pagination',
  })
  @ApiResponse({
    status: 200,
    description: 'Marketplace items retrieved successfully',
    schema: {
      properties: {
        items: {
          type: 'array',
          items: {
            properties: {
              id: { type: 'string' },
              name: { type: 'string', example: 'Turbo Engine V5' },
              description: {
                type: 'string',
                example: 'High-performance engine for advanced spaceships',
              },
              itemType: { type: 'string', example: 'engine' },
              rarity: { type: 'string', example: 'rare' },
              price: { type: 'number', example: 50.0 },
              totalPowerBoost: { type: 'number', example: 75 },
              imageUrl: {
                type: 'string',
                example: 'https://example.com/item.png',
              },
              viewCount: { type: 'number', example: 42 },
              favoriteCount: { type: 'number', example: 15 },
              seller: {
                type: 'object',
                properties: {
                  username: { type: 'string', example: 'SpaceTrader' },
                  walletAddress: { type: 'string' },
                },
              },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        totalPages: { type: 'number', example: 8 },
      },
    },
  })
  async getMarketplaceItems(@Query() filters: GetMarketplaceItemsDto) {
    return await this.marketplaceService.getMarketplaceItems(filters);
  }

  @Public()
  @Get('stats')
  @ApiOperation({
    summary: 'Get marketplace statistics',
    description: 'Retrieve marketplace statistics and analytics',
  })
  @ApiResponse({
    status: 200,
    description: 'Marketplace statistics retrieved successfully',
    schema: {
      properties: {
        totalItems: { type: 'number', example: 1500 },
        activeItems: { type: 'number', example: 350 },
        totalVolume: { type: 'number', example: 12500.5 },
        averagePrice: { type: 'number', example: 45.2 },
        categoryStats: {
          type: 'object',
          properties: {
            engine: { type: 'number', example: 120 },
            material: { type: 'number', example: 85 },
            special_equipment: { type: 'number', example: 95 },
            fuel_tank: { type: 'number', example: 50 },
          },
        },
        rarityStats: {
          type: 'object',
          properties: {
            common: { type: 'number', example: 200 },
            rare: { type: 'number', example: 100 },
            epic: { type: 'number', example: 40 },
            legendary: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  async getMarketplaceStats() {
    return await this.marketplaceService.getMarketplaceStats();
  }

  @Public()
  @Get(':itemId')
  @ApiOperation({
    summary: 'Get marketplace item details',
    description:
      'Retrieve detailed information about a specific marketplace item',
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID of the marketplace item',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Marketplace item details retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Marketplace item not found' })
  async getMarketplaceItem(@Param('itemId') itemId: string) {
    return await this.marketplaceService.getMarketplaceItem(itemId);
  }

  @Post()
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'List item for sale',
    description: 'Create a new marketplace listing for an item',
  })
  @ApiResponse({
    status: 201,
    description: 'Item listed successfully',
    schema: {
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        description: { type: 'string' },
        itemType: { type: 'string' },
        rarity: { type: 'string' },
        price: { type: 'number' },
        status: { type: 'string', example: 'active' },
        expiresAt: { type: 'string', format: 'date-time' },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid item data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listItem(
    @CurrentUser() user: User,
    @Body() createDto: CreateMarketplaceItemDto,
  ) {
    return await this.marketplaceService.listItem(user.id, createDto);
  }

  @Post(':itemId/purchase')
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'Purchase marketplace item',
    description: 'Purchase a marketplace item with KAIA tokens',
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID of the marketplace item to purchase',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Item purchased successfully',
    schema: {
      properties: {
        success: { type: 'boolean', example: true },
        transactionHash: { type: 'string', example: '0x...' },
        item: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            status: { type: 'string', example: 'sold' },
            soldAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Purchase failed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async purchaseItem(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
  ) {
    return await this.marketplaceService.purchaseItem(user.id, itemId);
  }

  @Delete(':itemId')
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'Cancel item listing',
    description: 'Cancel an active marketplace listing',
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID of the marketplace item to cancel',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Item listing cancelled successfully',
  })
  @ApiResponse({ status: 400, description: 'Cannot cancel this listing' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Item not found or not owned' })
  async cancelListing(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
  ) {
    return await this.marketplaceService.cancelListing(user.id, itemId);
  }

  @Get('my/:type')
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'Get user marketplace items',
    description:
      'Retrieve marketplace items for the authenticated user by type',
  })
  @ApiParam({
    name: 'type',
    description: 'Type of items to retrieve',
    enum: ['selling', 'sold', 'purchased'],
    example: 'selling',
  })
  @ApiResponse({
    status: 200,
    description: 'User marketplace items retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          price: { type: 'number' },
          status: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          soldAt: { type: 'string', format: 'date-time' },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserMarketplaceItems(
    @CurrentUser() user: User,
    @Param('type') type: 'selling' | 'sold' | 'purchased',
  ) {
    return await this.marketplaceService.getUserMarketplaceItems(user.id, type);
  }

  @Post(':itemId/favorite')
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'Add item to favorites',
    description: 'Add a marketplace item to user favorites',
  })
  @ApiParam({
    name: 'itemId',
    description: 'ID of the marketplace item to favorite',
    example: 'uuid-string',
  })
  @ApiResponse({
    status: 200,
    description: 'Item added to favorites successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Item not found' })
  async addToFavorites(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
  ) {
    await this.marketplaceService.addToFavorites(user.id, itemId);
    return { success: true, message: 'Item added to favorites' };
  }
}
