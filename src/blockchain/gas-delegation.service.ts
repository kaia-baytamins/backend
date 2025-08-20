import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

import { BlockchainService } from './blockchain.service';

interface FeeDelegationRequest {
  from: string;
  to: string;
  data: string;
  gas: string;
  gasPrice?: string;
  value?: string;
}

interface FeeDelegationResponse {
  success: boolean;
  txHash?: string;
  error?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

@Injectable()
export class GasDelegationService {
  private readonly logger = new Logger(GasDelegationService.name);
  private readonly maxGasLimit: bigint;
  private readonly maxValueLimit: bigint;

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
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
        `Gas delegation request from ${request.from} to ${request.to}`,
      );

      // Validate the request
      await this.validateDelegationRequest(request);

      // Get the wallet for fee delegation
      const wallet = this.blockchainService.getWallet();
      if (!wallet) {
        throw new Error('Fee delegation wallet not configured');
      }

      // Prepare the transaction with fee delegation
      const transaction = await this.prepareDelegatedTransaction(request);

      // Send the transaction
      const tx = await wallet.sendTransaction(transaction);
      this.logger.log(`Fee delegated transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await this.blockchainService.waitForTransaction(
        tx.hash,
        1,
      );

      if (receipt) {
        this.logger.log(`Fee delegation successful: ${tx.hash}`);
        return {
          success: true,
          txHash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          effectiveGasPrice: receipt.gasPrice?.toString(),
        };
      } else {
        throw new Error('Transaction receipt not found');
      }
    } catch (error) {
      this.logger.error('Gas delegation failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate gas delegation request
   */
  private async validateDelegationRequest(
    request: FeeDelegationRequest,
  ): Promise<void> {
    // Validate addresses
    if (!this.blockchainService.isValidAddress(request.from)) {
      throw new BadRequestException('Invalid from address');
    }

    if (!this.blockchainService.isValidAddress(request.to)) {
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
   * Prepare transaction with fee delegation
   */
  private async prepareDelegatedTransaction(
    request: FeeDelegationRequest,
  ): Promise<ethers.TransactionRequest> {
    const gasPrice = request.gasPrice
      ? BigInt(request.gasPrice)
      : await this.blockchainService.getGasPrice();

    return {
      to: request.to,
      data: request.data,
      gasLimit: BigInt(request.gas),
      gasPrice: gasPrice,
      value: request.value ? BigInt(request.value) : 0n,
      // For KAIA fee delegation, the fee payer signs the transaction
      // The actual implementation would depend on KAIA's specific fee delegation mechanism
    };
  }

  /**
   * Estimate cost of gas delegation
   */
  async estimateDelegationCost(request: FeeDelegationRequest): Promise<{
    estimatedGas: string;
    gasPrice: string;
    estimatedCost: string;
  }> {
    try {
      const transaction = {
        to: request.to,
        data: request.data,
        value: request.value ? BigInt(request.value) : 0n,
      };

      const estimatedGas =
        await this.blockchainService.estimateGas(transaction);
      const gasPrice = await this.blockchainService.getGasPrice();
      const estimatedCost = estimatedGas * gasPrice;

      return {
        estimatedGas: estimatedGas.toString(),
        gasPrice: gasPrice.toString(),
        estimatedCost: this.blockchainService.formatKaia(estimatedCost),
      };
    } catch (error) {
      this.logger.error('Error estimating delegation cost:', error);
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
  }> {
    // In a real implementation, this would query a database or tracking system
    // For now, return placeholder data
    return {
      totalDelegations: 0,
      totalGasCost: '0',
      averageGasUsed: '0',
    };
  }

  /**
   * Create a fee-delegated transaction signature for KAIA
   * This is specific to KAIA's fee delegation mechanism
   */
  async createFeeDelegatedSignature(
    userSignature: string,
    transaction: ethers.TransactionRequest,
  ): Promise<string> {
    const wallet = this.blockchainService.getWallet();
    if (!wallet) {
      throw new Error('Fee delegation wallet not configured');
    }

    try {
      // This is a simplified version - actual KAIA fee delegation
      // would require specific transaction encoding
      const txHash = ethers.keccak256(
        ethers.toUtf8Bytes(JSON.stringify(transaction)),
      );
      const feePayerSignature = await wallet.signMessage(txHash);

      // Combine user and fee payer signatures according to KAIA spec
      return `${userSignature}:${feePayerSignature}`;
    } catch (error) {
      this.logger.error('Error creating fee delegated signature:', error);
      throw error;
    }
  }
}
