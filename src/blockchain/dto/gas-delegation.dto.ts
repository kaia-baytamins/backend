import { IsString, IsOptional, IsIn, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

const TRANSACTION_TYPES = [
  'value_transfer',
  'value_transfer_memo',
  'contract_execution',
] as const;
type TransactionType = (typeof TRANSACTION_TYPES)[number];

export class DelegateGasFeesDto {
  @ApiProperty({
    description: 'Sender address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid from address format' })
  from: string;

  @ApiPropertyOptional({
    description: 'Recipient address',
    example: '0x0987654321098765432109876543210987654321',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid to address format' })
  to?: string;

  @ApiPropertyOptional({
    description: 'Transaction data (for contract calls)',
    example: '0x',
  })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiProperty({
    description: 'Gas limit',
    example: '21000',
  })
  @IsString()
  gas: string;

  @ApiPropertyOptional({
    description: 'Gas price in wei',
    example: '20000000000',
  })
  @IsOptional()
  @IsString()
  gasPrice?: string;

  @ApiPropertyOptional({
    description: 'Value to transfer in wei',
    example: '0',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'Transaction memo',
    example: 'Quest reward',
  })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({
    description: 'Transaction type',
    enum: TRANSACTION_TYPES,
    example: 'contract_execution',
  })
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;

  @ApiPropertyOptional({
    description: 'User signature for the transaction',
    example: '0x...',
  })
  @IsOptional()
  @IsString()
  userSignature?: string;

  @ApiPropertyOptional({
    description: 'The message that was signed by the user',
    example: 'KAIA Transaction Signing...',
  })
  @IsOptional()
  @IsString()
  signedMessage?: string;
}

export class EstimateDelegationCostDto {
  @ApiProperty({
    description: 'Sender address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid from address format' })
  from: string;

  @ApiPropertyOptional({
    description: 'Recipient address',
    example: '0x0987654321098765432109876543210987654321',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid to address format' })
  to?: string;

  @ApiPropertyOptional({
    description: 'Transaction data (for contract calls)',
    example: '0x',
  })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiProperty({
    description: 'Gas limit',
    example: '21000',
  })
  @IsString()
  gas: string;

  @ApiPropertyOptional({
    description: 'Gas price in wei',
    example: '20000000000',
  })
  @IsOptional()
  @IsString()
  gasPrice?: string;

  @ApiPropertyOptional({
    description: 'Value to transfer in wei',
    example: '0',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'Transaction memo',
    example: 'Quest reward',
  })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({
    description: 'Transaction type',
    enum: TRANSACTION_TYPES,
    example: 'contract_execution',
  })
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;
}

export class CreateTransactionForSigningDto {
  @ApiProperty({
    description: 'Sender address',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid from address format' })
  from: string;

  @ApiPropertyOptional({
    description: 'Recipient address',
    example: '0x0987654321098765432109876543210987654321',
  })
  @IsOptional()
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid to address format' })
  to?: string;

  @ApiPropertyOptional({
    description: 'Transaction data (for contract calls)',
    example: '0x',
  })
  @IsOptional()
  @IsString()
  data?: string;

  @ApiProperty({
    description: 'Gas limit',
    example: '21000',
  })
  @IsString()
  gas: string;

  @ApiPropertyOptional({
    description: 'Gas price in wei',
    example: '20000000000',
  })
  @IsOptional()
  @IsString()
  gasPrice?: string;

  @ApiPropertyOptional({
    description: 'Value to transfer in wei',
    example: '0',
  })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({
    description: 'Transaction memo',
    example: 'Quest reward',
  })
  @IsOptional()
  @IsString()
  memo?: string;

  @ApiPropertyOptional({
    description: 'Transaction type',
    enum: TRANSACTION_TYPES,
    example: 'contract_execution',
  })
  @IsOptional()
  @IsIn(TRANSACTION_TYPES)
  type?: TransactionType;
}

export class CheckEligibilityDto {
  @ApiProperty({
    description: 'Wallet address to check eligibility',
    example: '0x1234567890123456789012345678901234567890',
  })
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'Invalid address format' })
  address: string;
}
