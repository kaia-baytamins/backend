import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { Public } from '../auth/decorators/public.decorator';
import { EquipItemDto, UnequipItemDto, SellItemDto } from './dto/equip.dto';

@ApiTags('Inventory')
@Controller('inventory')
@Public()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('line-id/:lineUserId')
  @ApiOperation({
    summary: 'Get user inventory by LINE ID',
    description: 'Get user inventory items with amounts using LINE user ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User inventory retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        inventory: {
          type: 'object',
          additionalProperties: { type: 'number' },
          example: {
            '0': 5,
            '1': 3,
            '16': 10,
            '17': 2,
            '32': 1,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getInventoryByLineId(@Param('lineUserId') lineUserId: string) {
    const inventory =
      await this.inventoryService.getUserInventoryByLineId(lineUserId);
    return { inventory };
  }

  @Get('wallet/:walletAddress')
  @ApiOperation({
    summary: 'Get user inventory by wallet address',
    description: 'Get user inventory items with amounts using wallet address',
  })
  @ApiResponse({
    status: 200,
    description: 'User inventory retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        inventory: {
          type: 'object',
          additionalProperties: { type: 'number' },
          example: {
            '0': 5,
            '1': 3,
            '16': 10,
            '17': 2,
            '32': 1,
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getInventoryByWallet(@Param('walletAddress') walletAddress: string) {
    const inventory =
      await this.inventoryService.getInventoryByWalletAddress(walletAddress);
    return { inventory };
  }

  @Get('line-id/:lineUserId/type/:itemType')
  @ApiOperation({
    summary: 'Get inventory by item type',
    description:
      'Get user inventory filtered by item type (engine, material, special_equipment, fuel_tank)',
  })
  @ApiResponse({
    status: 200,
    description: 'Filtered inventory retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        inventory: {
          type: 'object',
          additionalProperties: { type: 'number' },
          example: {
            '0': 5,
            '1': 3,
            '2': 1,
          },
        },
        itemType: {
          type: 'string',
          example: 'engine',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getInventoryByTypeAndLineId(
    @Param('lineUserId') lineUserId: string,
    @Param('itemType')
    itemType: 'engine' | 'material' | 'special_equipment' | 'fuel_tank',
  ) {
    // LINE ID로 유저 찾기
    const user = await this.inventoryService['userRepository'].findOne({
      where: { lineUserId },
      select: ['walletAddress'],
    });

    if (!user || !user.walletAddress) {
      throw new Error('User not found or wallet not connected');
    }

    const inventory = await this.inventoryService.getWalletInventoryByType(
      user.walletAddress,
      itemType,
    );
    return { inventory, itemType };
  }

  @Post('equip')
  @ApiOperation({
    summary: 'Equip an item',
    description:
      'Equip an item from inventory to spaceship using wallet address',
  })
  @ApiResponse({
    status: 200,
    description: 'Item equipped successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Item equipped successfully' },
        equippedItem: {
          type: 'object',
          properties: {
            itemId: { type: 'number', example: 0 },
            name: { type: 'string', example: 'Engine #0' },
            type: { type: 'string', example: 'engine' },
            rarity: { type: 'string', example: 'common' },
            powerBoost: { type: 'number', example: 10 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Item not found in inventory or validation failed',
  })
  async equipItem(@Body() equipDto: EquipItemDto) {
    return await this.inventoryService.equipItem(
      equipDto.walletAddress,
      equipDto.itemId,
    );
  }

  @Post('unequip')
  @ApiOperation({
    summary: 'Unequip an item',
    description: 'Remove equipped item from spaceship using wallet address',
  })
  @ApiResponse({
    status: 200,
    description: 'Item unequipped successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Item unequipped successfully' },
        unequippedItem: {
          type: 'object',
          properties: {
            itemId: { type: 'number', example: 0 },
            name: { type: 'string', example: 'Engine #0' },
            type: { type: 'string', example: 'engine' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Item not equipped or not found' })
  async unequipItem(@Body() unequipDto: UnequipItemDto) {
    return await this.inventoryService.unequipItem(
      unequipDto.walletAddress,
      unequipDto.itemId,
    );
  }

  @Get('equipped/:walletAddress')
  @ApiOperation({
    summary: 'Get equipped items',
    description: 'Get all equipped items for a wallet address spaceship',
  })
  @ApiResponse({
    status: 200,
    description: 'Equipped items retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        equipment: {
          type: 'object',
          properties: {
            engine: {
              type: 'object',
              nullable: true,
              properties: {
                itemId: { type: 'number' },
                name: { type: 'string' },
                type: { type: 'string' },
                rarity: { type: 'string' },
                powerBoost: { type: 'number' },
              },
            },
            material: {
              type: 'object',
              nullable: true,
              properties: {
                itemId: { type: 'number' },
                name: { type: 'string' },
                type: { type: 'string' },
                rarity: { type: 'string' },
                powerBoost: { type: 'number' },
              },
            },
            specialEquipment: {
              type: 'object',
              nullable: true,
              properties: {
                itemId: { type: 'number' },
                name: { type: 'string' },
                type: { type: 'string' },
                rarity: { type: 'string' },
                powerBoost: { type: 'number' },
              },
            },
            fuelTank: {
              type: 'object',
              nullable: true,
              properties: {
                itemId: { type: 'number' },
                name: { type: 'string' },
                type: { type: 'string' },
                rarity: { type: 'string' },
                powerBoost: { type: 'number' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'User not found or spaceship not found',
  })
  async getEquippedItems(@Param('walletAddress') walletAddress: string) {
    return await this.inventoryService.getEquippedItems(walletAddress);
  }

  @Post('sell')
  @ApiOperation({
    summary: 'Sell an item from inventory',
    description: 'Remove an item from inventory for selling (demo purpose)',
  })
  @ApiResponse({
    status: 200,
    description: 'Item sold successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Item sold successfully' },
        soldItem: {
          type: 'object',
          properties: {
            itemId: { type: 'number', example: 1 },
            name: { type: 'string', example: 'Engine #1' },
            type: { type: 'string', example: 'engine' },
            price: { type: 'number', example: 2.5 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Item not found in inventory or insufficient quantity',
  })
  async sellItem(@Body() sellDto: SellItemDto) {
    return await this.inventoryService.sellItem(
      sellDto.walletAddress,
      sellDto.itemId,
      sellDto.price,
    );
  }
}
