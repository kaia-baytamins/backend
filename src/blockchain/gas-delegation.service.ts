import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ethers } from 'ethers';

import { BlockchainService } from './blockchain.service';
import { KaiaTransactionService } from './kaia-transaction.service';
import { KaiaEthersExtService } from './kaia-ethers-ext.service';
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
  signedMessage?: string;
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
    private readonly kaiaEthersExtService: KaiaEthersExtService,
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

      // Handle KAIA SDK senderTxHashRLP format
      if (
        request.signedMessage &&
        typeof request.signedMessage === 'string' &&
        request.signedMessage.startsWith('0x31')
      ) {
        // This is a KAIA SDK senderTxHashRLP - use it directly for fee delegation
        this.logger.log(
          '✅ Received KAIA SDK senderTxHashRLP, proceeding with fee delegation',
        );
        this.logger.debug(
          `senderTxHashRLP: ${request.signedMessage.substring(0, 50)}...`,
        );
      } else if (request.userSignature && request.signedMessage) {
        // Legacy signature validation (fallback)
        const isSignatureValid = await this.validateUserSignature(
          request.from,
          request.signedMessage,
          request.userSignature,
        );

        if (!isSignatureValid) {
          throw new KaiaTransactionError(
            'User signature validation failed. Please ensure you signed the correct message.',
          );
        }
        this.logger.log('✅ User signature validated successfully');
      } else {
        throw new KaiaTransactionError(
          'Either KAIA SDK senderTxHashRLP or user signature is required.',
        );
      }

      // Get the wallet for fee delegation
      const wallet = this.blockchainService.getWallet();
      if (!wallet) {
        throw new KaiaTransactionError('Fee delegation wallet not configured');
      }

      // Use the new KAIA ethers-ext service for fee delegation
      let txResponse;

      if (request.signedMessage && request.signedMessage.startsWith('0x31')) {
        // Use KAIA SDK senderTxHashRLP directly - pass it as userSignedTxHashRLP
        txResponse = await this.kaiaEthersExtService.executeFeeDelegation(
          {
            from: request.from,
            to: request.to || '',
            value: request.value || '0',
            data: request.data,
            gas: request.gas,
            gasPrice: request.gasPrice,
          },
          request.signedMessage, // Pass the senderTxHashRLP as userSignedTxHashRLP
        );
      } else {
        // Fallback to legacy method
        txResponse = await this.kaiaEthersExtService.executeFeeDelegation(
          {
            from: request.from,
            to: request.to || '',
            value: request.value || '0',
            data: request.data,
            gas: request.gas,
            gasPrice: request.gasPrice,
          },
          request.userSignature,
        );
      }

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

      // Simple transaction hash generation (KAIA SDK handles RLP encoding)
      const chainId = parseInt(this.blockchainService.getChainId() || '1001');
      const transactionHash = ethers.id(
        `${kaiaTransaction.type}-${(kaiaTransaction as any).to || 'deploy'}-${kaiaTransaction.nonce}`,
      );

      return {
        transaction: kaiaTransaction,
        encodedTx: '0x', // Placeholder - not needed with KAIA SDK
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

  /**
   * Simple signature validation (legacy method for non-KAIA SDK approaches)
   */
  async validateUserSignature(
    userAddress: string,
    message: string,
    signature: string,
  ): Promise<boolean> {
    try {
      let recoveredAddress: string;

      // Check if message is a transaction hash (64 hex chars after 0x)
      const isTransactionHash = /^0x[a-fA-F0-9]{64}$/.test(message);

      if (isTransactionHash) {
        // For transaction hashes, we need to recover from the hash directly
        // The signature contains EIP-155 encoding with chain ID
        this.logger.debug(`Validating transaction hash signature: ${message}`);

        try {
          // Manual signature parsing to preserve original EIP-155 V value
          const r = signature.slice(0, 66); // 0x + 64 hex chars
          const s = '0x' + signature.slice(66, 130); // 64 hex chars
          const vHex = '0x' + signature.slice(130); // remaining chars
          const originalV = parseInt(vHex, 16);

          const chainId = parseInt(
            this.blockchainService.getChainId() || '1001',
          );

          this.logger.debug(`EIP-155 signature analysis:`, {
            r,
            s,
            vHex,
            originalV,
            chainId,
            expectedV: 27 + 0 + 2 * chainId, // For recoveryParam = 0
            expectedV1: 27 + 1 + 2 * chainId, // For recoveryParam = 1
            actualV: originalV,
          });

          // Create signature object with preserved V value
          const sig = {
            r,
            s,
            v: originalV,
            yParity: (originalV - 27 - 2 * chainId) % 2,
          };

          // Try multiple recovery methods
          let verifyMessageResult: string = 'ERROR';
          let eip155RecoveryResult: string = 'ERROR';

          try {
            // Method 1: Standard message verification (with prefix)
            verifyMessageResult = ethers.verifyMessage(message, signature);
          } catch (e) {
            verifyMessageResult = 'ERROR: ' + e.message;
          }

          try {
            // Method 2: Manual EIP-155 recovery for personal_sign + EIP-155 transformation
            const messageHash = ethers.hashMessage(ethers.getBytes(message));

            // Calculate recovery parameter from EIP-155 V value
            const recoveryParam = sig.yParity;

            const recoverySignature = ethers.Signature.from({
              r: sig.r,
              s: sig.s,
              v: 27 + recoveryParam, // Convert back to non-EIP-155 format for recovery
            });

            eip155RecoveryResult = ethers.recoverAddress(
              messageHash,
              recoverySignature,
            );
          } catch (e) {
            eip155RecoveryResult = 'ERROR: ' + e.message;
          }

          this.logger.debug(`Testing multiple signature validation methods:`, {
            message,
            signature,
            verifyMessage: verifyMessageResult,
            eip155Recovery: eip155RecoveryResult,
            expectedAddress: userAddress.toLowerCase(),
          });

          // Choose the method that works - prioritize EIP-155 recovery for transaction hashes
          if (!eip155RecoveryResult.startsWith('ERROR:')) {
            recoveredAddress = eip155RecoveryResult;
            this.logger.debug('Using EIP-155 recovery result');
          } else if (!verifyMessageResult.startsWith('ERROR:')) {
            recoveredAddress = verifyMessageResult;
            this.logger.debug('Using standard message verification result');
          } else {
            throw new Error('All signature recovery methods failed');
          }
        } catch (hashError) {
          this.logger.warn(
            `Failed to validate as transaction hash with prefix: ${hashError.message}`,
          );

          try {
            // Fallback: try direct hash recovery without prefix
            recoveredAddress = ethers.recoverAddress(message, signature);

            this.logger.debug(`Direct hash recovery attempt:`, {
              message,
              signature,
              recoveredAddress,
              method: 'recoverAddress (direct hash)',
            });
          } catch (directError) {
            this.logger.warn(
              `Failed direct hash recovery: ${directError.message}`,
            );
            // Final fallback to message verification
            recoveredAddress = ethers.verifyMessage(message, signature);
          }
        }
      } else {
        // For regular messages, use standard message verification
        this.logger.debug(`Validating regular message signature`);
        recoveredAddress = ethers.verifyMessage(message, signature);
      }

      // Compare with the expected user address (case-insensitive)
      const isValid =
        recoveredAddress.toLowerCase() === userAddress.toLowerCase();

      if (!isValid) {
        this.logger.warn(
          `Signature validation failed. Expected: ${userAddress}, Recovered: ${recoveredAddress}`,
        );
        this.logger.debug(`Signature validation details:`, {
          message,
          signature,
          isTransactionHash,
          expectedAddress: userAddress.toLowerCase(),
          recoveredAddress: recoveredAddress.toLowerCase(),
        });
      } else {
        this.logger.log(
          `Signature validation successful for user: ${userAddress}`,
        );
      }

      return isValid;
    } catch (error) {
      this.logger.error('Error validating user signature:', error);
      this.logger.debug('Signature validation error details:', {
        message,
        signature,
        userAddress,
        error: error.message,
      });
      return false;
    }
  }
}
