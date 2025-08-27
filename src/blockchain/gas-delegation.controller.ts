import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

import {
  GasDelegationService,
  FeeDelegationResponse,
} from './gas-delegation.service';

import {
  DelegateGasFeesDto,
  EstimateDelegationCostDto,
  CreateTransactionForSigningDto,
  CheckEligibilityDto,
} from './dto/gas-delegation.dto';

@ApiTags('Gas Delegation')
@Controller('blockchain/gas-delegation')
export class GasDelegationController {
  private readonly logger = new Logger(GasDelegationController.name);

  constructor(private readonly gasDelegationService: GasDelegationService) {}

  @Post('delegate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delegate gas fees for a transaction',
    description:
      'Submit a transaction for gas fee delegation. The fee payer will cover the gas costs.',
  })
  @ApiBody({ type: DelegateGasFeesDto })
  @ApiResponse({
    status: 200,
    description: 'Gas delegation completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        txHash: { type: 'string' },
        gasUsed: { type: 'string' },
        effectiveGasPrice: { type: 'string' },
        feePayer: { type: 'string' },
        transactionType: { type: 'string' },
        error: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request parameters',
  })
  async delegateGasFees(
    @Body() dto: DelegateGasFeesDto,
  ): Promise<FeeDelegationResponse> {
    try {
      this.logger.log(`Gas delegation request received:`, {
        from: dto.from,
        to: dto.to,
        type: dto.type,
        gas: dto.gas,
        gasPrice: dto.gasPrice,
        value: dto.value,
        hasData: !!dto.data,
        hasSignature: !!dto.userSignature,
      });

      // Validate required fields
      if (!dto.from || !dto.gas) {
        throw new BadRequestException('from and gas fields are required');
      }

      // Validate addresses
      if (!/^0x[a-fA-F0-9]{40}$/.test(dto.from)) {
        throw new BadRequestException('Invalid from address format');
      }

      if (dto.to && !/^0x[a-fA-F0-9]{40}$/.test(dto.to)) {
        throw new BadRequestException('Invalid to address format');
      }

      return await this.gasDelegationService.delegateGasFees({
        from: dto.from.toLowerCase(),
        to: dto.to?.toLowerCase(),
        data: dto.data,
        gas: dto.gas,
        gasPrice: dto.gasPrice,
        value: dto.value || '0',
        memo: dto.memo,
        type: dto.type,
        userSignature: dto.userSignature,
        signedMessage: dto.signedMessage,
      });
    } catch (error) {
      this.logger.error('Gas delegation failed:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || 'Gas delegation failed');
    }
  }

  @Post('estimate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Estimate gas delegation cost',
    description:
      'Get estimated gas cost for a transaction before submitting for delegation.',
  })
  @ApiBody({ type: EstimateDelegationCostDto })
  @ApiResponse({
    status: 200,
    description: 'Gas estimation completed successfully',
    schema: {
      type: 'object',
      properties: {
        estimatedGas: { type: 'string' },
        gasPrice: { type: 'string' },
        estimatedCost: { type: 'string' },
        transactionType: { type: 'string' },
      },
    },
  })
  async estimateDelegationCost(@Body() dto: EstimateDelegationCostDto) {
    try {
      this.logger.log(`Gas estimation request: from=${dto.from}, to=${dto.to}`);

      // Validate required fields
      if (!dto.from || !dto.gas) {
        throw new BadRequestException('from and gas fields are required');
      }

      // Validate addresses
      if (!/^0x[a-fA-F0-9]{40}$/.test(dto.from)) {
        throw new BadRequestException('Invalid from address format');
      }

      if (dto.to && !/^0x[a-fA-F0-9]{40}$/.test(dto.to)) {
        throw new BadRequestException('Invalid to address format');
      }

      return await this.gasDelegationService.estimateDelegationCost({
        from: dto.from.toLowerCase(),
        to: dto.to?.toLowerCase(),
        data: dto.data,
        gas: dto.gas,
        gasPrice: dto.gasPrice,
        value: dto.value || '0',
        memo: dto.memo,
        type: dto.type,
      });
    } catch (error) {
      this.logger.error('Gas estimation failed:', error);
      throw new BadRequestException(error.message || 'Gas estimation failed');
    }
  }

  @Post('prepare-signing')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Prepare transaction for user signing',
    description:
      'Create a transaction object that needs to be signed by the user before fee delegation.',
  })
  @ApiBody({ type: CreateTransactionForSigningDto })
  @ApiResponse({
    status: 200,
    description: 'Transaction prepared for signing',
    schema: {
      type: 'object',
      properties: {
        transaction: { type: 'object' },
        encodedTx: { type: 'string' },
        transactionHash: { type: 'string' },
      },
    },
  })
  async createTransactionForSigning(
    @Body() dto: CreateTransactionForSigningDto,
  ) {
    try {
      this.logger.log(
        `Prepare signing request: from=${dto.from}, to=${dto.to}`,
      );

      // Validate required fields
      if (!dto.from || !dto.gas) {
        throw new BadRequestException('from and gas fields are required');
      }

      // Validate addresses
      if (!/^0x[a-fA-F0-9]{40}$/.test(dto.from)) {
        throw new BadRequestException('Invalid from address format');
      }

      if (dto.to && !/^0x[a-fA-F0-9]{40}$/.test(dto.to)) {
        throw new BadRequestException('Invalid to address format');
      }

      return await this.gasDelegationService.createTransactionForSigning({
        from: dto.from.toLowerCase(),
        to: dto.to?.toLowerCase(),
        data: dto.data,
        gas: dto.gas,
        gasPrice: dto.gasPrice,
        value: dto.value || '0',
        memo: dto.memo,
        type: dto.type,
      });
    } catch (error) {
      this.logger.error('Transaction preparation failed:', error);
      throw new BadRequestException(
        error.message || 'Transaction preparation failed',
      );
    }
  }

  @Post('check-eligibility')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Check if address is eligible for gas delegation',
    description:
      'Check if a wallet address meets the criteria for gas delegation.',
  })
  @ApiBody({ type: CheckEligibilityDto })
  @ApiResponse({
    status: 200,
    description: 'Eligibility check completed',
    schema: {
      type: 'object',
      properties: {
        eligible: { type: 'boolean' },
        reason: { type: 'string' },
      },
    },
  })
  async checkEligibility(@Body() dto: CheckEligibilityDto) {
    try {
      this.logger.log(`Eligibility check: address=${dto.address}`);

      // Validate required fields
      if (!dto.address) {
        throw new BadRequestException('address field is required');
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(dto.address)) {
        throw new BadRequestException('Invalid address format');
      }

      return await this.gasDelegationService.isEligibleForDelegation(
        dto.address.toLowerCase(),
      );
    } catch (error) {
      this.logger.error('Eligibility check failed:', error);
      throw new BadRequestException(
        error.message || 'Eligibility check failed',
      );
    }
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Get gas delegation statistics',
    description: 'Retrieve statistics about gas delegation service usage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalDelegations: { type: 'number' },
        totalGasCost: { type: 'string' },
        averageGasUsed: { type: 'string' },
        feePayer: { type: 'string' },
        supportedTypes: { type: 'array', items: { type: 'string' } },
      },
    },
  })
  async getStats() {
    try {
      this.logger.log('Gas delegation stats requested');
      return await this.gasDelegationService.getDelegationStats();
    } catch (error) {
      this.logger.error('Failed to get stats:', error);
      throw new BadRequestException(error.message || 'Failed to get stats');
    }
  }

  @Get('supported-types')
  @ApiOperation({
    summary: 'Get supported transaction types',
    description: 'List all transaction types supported by gas delegation.',
  })
  @ApiResponse({
    status: 200,
    description: 'Supported types retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        supportedTypes: { type: 'array', items: { type: 'string' } },
        feePayer: { type: 'string' },
      },
    },
  })
  getSupportedTypes() {
    this.logger.log('Supported types requested');
    return {
      supportedTypes: this.gasDelegationService.getSupportedTransactionTypes(),
      feePayer: this.gasDelegationService.getFeePayer(),
    };
  }

  @Get('fee-payer')
  @ApiOperation({
    summary: 'Get fee payer address',
    description:
      'Get the address that will pay for gas fees in delegated transactions.',
  })
  @ApiResponse({
    status: 200,
    description: 'Fee payer address retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        feePayer: { type: 'string' },
      },
    },
  })
  getFeePayer() {
    this.logger.log('Fee payer address requested');
    return {
      feePayer: this.gasDelegationService.getFeePayer(),
    };
  }
}
