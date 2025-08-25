import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEthereumAddress,
  IsEnum,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PetType } from '../../entities/pet.entity';

export class WalletLoginDto {
  @ApiProperty({
    description: 'Wallet address',
    example: '0x742C4f7C8e4C4e6f7A4a4a4a4a4a4a4a4a4a4a4a',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  walletAddress: string;

  @ApiProperty({
    description: 'Signed message for verification',
    example: '0x...',
  })
  @IsString()
  @IsNotEmpty()
  signature: string;

  @ApiProperty({
    description: 'Original message that was signed',
    example:
      'Please sign this message to authenticate with KAIA Game: 1234567890',
  })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'LINE user ID for MiniDapp integration',
    required: false,
    example: 'U1234567890abcdef1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  lineUserId?: string;
}

export class RefreshTokenDto {
  @ApiProperty({
    description: 'Refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class NonceRequestDto {
  @ApiProperty({
    description: 'Wallet address to get nonce for',
    example: '0x742C4f7C8e4C4e6f7A4a4a4a4a4a4a4a4a4a4a4a',
  })
  @IsEthereumAddress()
  @IsNotEmpty()
  walletAddress: string;
}

export class SimpleLineLoginDto {
  @ApiProperty({
    description: 'LINE user ID from useLiff profile',
    example: 'U1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({
    description: 'Display name from LINE profile',
    required: false,
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({
    description: 'Picture URL from LINE profile',
    required: false,
    example: 'https://profile.line-scdn.net/...',
  })
  @IsOptional()
  @IsString()
  pictureUrl?: string;
}

export class SelectPetDto {
  @ApiProperty({
    description: 'LINE user ID',
    example: 'U1234567890abcdef1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  lineUserId: string;

  @ApiProperty({
    description: 'Pet type to select',
    enum: PetType,
    example: PetType.MOMOCO,
  })
  @IsEnum(PetType)
  @IsNotEmpty()
  petType: PetType;
}
