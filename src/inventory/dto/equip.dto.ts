import { IsString, IsNotEmpty, IsNumber, Min, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class EquipItemDto {
  @ApiProperty({
    description: '지갑 주소',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid wallet address format' })
  walletAddress: string;

  @ApiProperty({
    description: '장착할 아이템 ID (ERC1155 토큰 ID)',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  itemId: number;
}

export class UnequipItemDto {
  @ApiProperty({
    description: '지갑 주소',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid wallet address format' })
  walletAddress: string;

  @ApiProperty({
    description: '해제할 아이템 ID (ERC1155 토큰 ID)',
    example: 0,
  })
  @IsNumber()
  @Min(0)
  itemId: number;
}

export class SellItemDto {
  @ApiProperty({
    description: '지갑 주소',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid wallet address format' })
  walletAddress: string;

  @ApiProperty({
    description: '판매할 아이템 ID (ERC1155 토큰 ID)',
    example: 1,
  })
  @IsNumber()
  @Min(0)
  itemId: number;

  @ApiProperty({
    description: '판매 가격 (USDT)',
    example: 2.5,
  })
  @IsNumber()
  @Min(0.1)
  price: number;
}
