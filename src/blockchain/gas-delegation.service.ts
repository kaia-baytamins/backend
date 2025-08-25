import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';

import { BlockchainService } from './blockchain.service';
import { KaiaTransactionService } from './kaia-transaction.service';
import { KaiaRlpService } from './kaia-rlp.service';
import {
  KaiaFeeDelegatedTransaction,
  KaiaTransactionError,
} from './kaia-types';

export interface FeeDelegationRequest {
  from: string;
  to?: string;
  data?: string;
  gas: string;
  gasPrice?: string;
  value?: string;
  memo?: string;
  type?: 'value_transfer' | 'value_transfer_memo' | 'contract_execution';
  userSignature?: string;
}

export interface FeeDelegationResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
  feePayer?: string;
  transactionType?: string;
}

@Injectable()
export class GasDelegationService {
  private readonly logger = new Logger(GasDelegationService.name);
  private readonly maxGasLimit: bigint;
  private readonly maxValueLimit: bigint;

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly kaiaTransactionService: KaiaTransactionService,
    private readonly rlpService: KaiaRlpService,
  ) {
    // Set reasonable limits for gas delegation
    this.maxGasLimit = ethers.parseUnits('500000', 'wei'); // 500k gas
    this.maxValueLimit = ethers.parseEther('0.1'); // 0.1 KAIA max value
  }

  /**
   * Delegate gas fees for a user transaction
   * This implements KAIA's fee delegation feature
   */
  async delegateGasFees(
    request: FeeDelegationRequest,
  ): Promise<FeeDelegationResponse> {
    try {
      this.logger.log(
        `KAIA gas delegation request from ${request.from} to ${request.to || 'contract deployment'}`,
      );

      // Validate the request
      await this.validateDelegationRequest(request);

      // Get the wallet for fee delegation
      const wallet = this.blockchainService.getWallet();
      if (!wallet) {
        throw new KaiaTransactionError('Fee delegation wallet not configured');
      }

      // Determine transaction type
      const transactionType = this.determineTransactionType(request);

      // Create KAIA fee delegated transaction
      const kaiaTransaction =
        await this.kaiaTransactionService.createFeeDelegatedTransaction({
          type: transactionType,
          from: request.from,
          to: request.to,
          value: request.value || '0',
          data: request.data,
          memo: request.memo,
          gas: request.gas,
          gasPrice: request.gasPrice,
        });

      // Send the fee delegated transaction
      const txResponse =
        await this.kaiaTransactionService.sendFeeDelegatedTransaction(
          kaiaTransaction,
          request.userSignature,
        );

      this.logger.log(
        `KAIA fee delegated transaction sent: ${txResponse.hash}`,
      );

      // Get receipt for additional details
      const receipt = await this.kaiaTransactionService.getTransactionReceipt(
        txResponse.hash,
      );

      return {
        success: true,
        txHash: txResponse.hash,
        gasUsed: receipt?.gasUsed,
        effectiveGasPrice: receipt?.gasPrice,
        feePayer: txResponse.feePayer,
        transactionType: txResponse.type,
      };
    } catch (error) {
      this.logger.error('KAIA gas delegation failed:', error);

      if (error instanceof KaiaTransactionError) {
        return {
          success: false,
          error: `KAIA Transaction Error: ${error.message}`,
        };
      }

      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Validate gas delegation request
   */
  private async validateDelegationRequest(
    request: FeeDelegationRequest,
  ): Promise<void> {
    // Validate from address
    if (!this.blockchainService.isValidAddress(request.from)) {
      throw new BadRequestException('Invalid from address');
    }

    // Validate to address if provided (not required for contract deployment)
    if (request.to && !this.blockchainService.isValidAddress(request.to)) {
      throw new BadRequestException('Invalid to address');
    }

    // Validate gas limit
    const gasLimit = BigInt(request.gas);
    if (gasLimit > this.maxGasLimit) {
      throw new BadRequestException(
        `Gas limit exceeds maximum: ${this.maxGasLimit.toString()}`,
      );
    }

    // Validate value if provided
    if (request.value) {
      const value = BigInt(request.value);
      if (value > this.maxValueLimit) {
        throw new BadRequestException(
          `Value exceeds maximum: ${this.maxValueLimit.toString()}`,
        );
      }
    }

    // Validate transaction type
    if (request.type && !this.isValidTransactionType(request.type)) {
      throw new BadRequestException(
        `Invalid transaction type: ${request.type}`,
      );
    }

    // Validate that the from address has enough balance for the value (not gas)
    if (request.value && BigInt(request.value) > 0) {
      const balance = await this.blockchainService.getBalance(request.from);
      const requiredBalance = BigInt(request.value);

      if (BigInt(this.blockchainService.parseKaia(balance)) < requiredBalance) {
        throw new BadRequestException(
          'Insufficient balance for transaction value',
        );
      }
    }
  }

  /**
   * Determine the appropriate KAIA transaction type
   */
  private determineTransactionType(
    request: FeeDelegationRequest,
  ): 'value_transfer' | 'value_transfer_memo' | 'contract_execution' {
    // If type is explicitly provided, use it
    if (request.type) {
      return request.type;
    }

    // Auto-determine based on request parameters
    if (request.memo) {
      return 'value_transfer_memo';
    }

    if (request.data && request.data !== '0x') {
      return 'contract_execution';
    }

    return 'value_transfer';
  }

  /**
   * Check if transaction type is valid
   */
  private isValidTransactionType(
    type: string,
  ): type is 'value_transfer' | 'value_transfer_memo' | 'contract_execution' {
    return [
      'value_transfer',
      'value_transfer_memo',
      'contract_execution',
    ].includes(type);
  }

  /**
   * Estimate cost of gas delegation using KAIA transaction service
   */
  async estimateDelegationCost(request: FeeDelegationRequest): Promise<{
    estimatedGas: string;
    gasPrice: string;
    estimatedCost: string;
    transactionType: string;
  }> {
    try {
      // Create the KAIA transaction for estimation
      const transactionType = this.determineTransactionType(request);
      const kaiaTransaction =
        await this.kaiaTransactionService.createFeeDelegatedTransaction({
          type: transactionType,
          from: request.from,
          to: request.to,
          value: request.value || '0',
          data: request.data,
          memo: request.memo,
          gas: request.gas,
          gasPrice: request.gasPrice,
        });

      // Estimate gas using KAIA transaction service
      const estimatedGas =
        await this.kaiaTransactionService.estimateGas(kaiaTransaction);
      const gasPrice = await this.blockchainService.getGasPrice();
      const estimatedCost = estimatedGas * gasPrice;

      return {
        estimatedGas: estimatedGas.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCost: this.blockchainService.formatKaia(estimatedCost),
        transactionType: kaiaTransaction.type,
      };
    } catch (error) {
      this.logger.error('Error estimating KAIA delegation cost:', error);
      throw error;
    }
  }

  /**
   * Check if address is eligible for gas delegation
   */
  async isEligibleForDelegation(address: string): Promise<{
    eligible: boolean;
    reason?: string;
  }> {
    try {
      // Check if address is valid
      if (!this.blockchainService.isValidAddress(address)) {
        return { eligible: false, reason: 'Invalid address' };
      }

      // Check if address has some minimum activity or balance
      const balance = await this.blockchainService.getBalance(address);
      const balanceInKaia = parseFloat(balance);

      // Allow delegation for addresses with at least some balance or activity
      if (balanceInKaia < 0.001) {
        return { eligible: false, reason: 'Insufficient minimum balance' };
      }

      return { eligible: true };
    } catch (error) {
      this.logger.error('Error checking delegation eligibility:', error);
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Get gas delegation statistics
   */
  async getDelegationStats(): Promise<{
    totalDelegations: number;
    totalGasCost: string;
    averageGasUsed: string;
    feePayer: string | null;
    supportedTypes: string[];
  }> {
    // In a real implementation, this would query a database or tracking system
    // For now, return placeholder data with KAIA-specific information
    return {
      totalDelegations: 0,
      totalGasCost: '0',
      averageGasUsed: '0',
      feePayer: this.getFeePayer(),
      supportedTypes: this.getSupportedTransactionTypes(),
    };
  }

  /**
   * Create a fee-delegated transaction for user signing
   * Returns the transaction data that needs to be signed by the user
   */
  async createTransactionForSigning(request: FeeDelegationRequest): Promise<{
    transaction: KaiaFeeDelegatedTransaction;
    encodedTx: string;
    transactionHash: string;
  }> {
    try {
      // Validate the request
      await this.validateDelegationRequest(request);

      // Create the KAIA transaction
      const transactionType = this.determineTransactionType(request);
      const kaiaTransaction =
        await this.kaiaTransactionService.createFeeDelegatedTransaction({
          type: transactionType,
          from: request.from,
          to: request.to,
          value: request.value || '0',
          data: request.data,
          memo: request.memo,
          gas: request.gas,
          gasPrice: request.gasPrice,
        });

      // Encode transaction for signing
      const encodedTx =
        this.rlpService.encodeTransactionForSigning(kaiaTransaction);
      const transactionHash = ethers.keccak256(encodedTx);

      return {
        transaction: kaiaTransaction,
        encodedTx,
        transactionHash,
      };
    } catch (error) {
      this.logger.error('Error creating transaction for signing:', error);
      throw error;
    }
  }

  /**
   * Get supported transaction types
   */
  getSupportedTransactionTypes(): string[] {
    return ['value_transfer', 'value_transfer_memo', 'contract_execution'];
  }

  /**
   * Get fee payer address
   */
  getFeePayer(): string | null {
    const wallet = this.blockchainService.getWallet();
    return wallet ? wallet.address : null;
  }
}
