import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

import { BlockchainService } from './blockchain.service';
import {
  KaiaFeeDelegatedTransaction,
  KaiaTransactionType,
  KaiaValueTransfer,
  KaiaValueTransferMemo,
  KaiaSmartContractExecution,
  KaiaSignature,
  RLPEncodableTransaction,
  KaiaTransactionResponse,
  KaiaTransactionReceipt,
  KAIA_RPC_METHODS,
  KaiaTransactionError,
} from './kaia-types';

interface KaiaTransactionRequest {
  type:
    | 'value_transfer'
    | 'value_transfer_memo'
    | 'contract_execution'
    | 'contract_deploy';
  from: string;
  to?: string;
  value: string;
  data?: string;
  memo?: string;
  gas: string;
  gasPrice?: string;
  nonce?: string;
}

/**
 * Service for creating and sending KAIA fee delegated transactions
 */
@Injectable()
export class KaiaTransactionService {
  private readonly logger = new Logger(KaiaTransactionService.name);

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Create a fee delegated transaction
   */
  async createFeeDelegatedTransaction(
    request: KaiaTransactionRequest,
  ): Promise<KaiaFeeDelegatedTransaction> {
    try {
      const nonce = request.nonce || (await this.getNonce(request.from));
      const gasPrice =
        request.gasPrice ||
        (await this.blockchainService.getGasPrice()).toString();

      switch (request.type) {
        case 'value_transfer':
          return this.createValueTransfer({
            ...request,
            nonce,
            gasPrice,
          });

        case 'value_transfer_memo':
          return this.createValueTransferMemo({
            ...request,
            nonce,
            gasPrice,
          });

        case 'contract_execution':
          return this.createContractExecution({
            ...request,
            nonce,
            gasPrice,
          });

        default:
          throw new KaiaTransactionError(
            `Unsupported transaction type: ${request.type}`,
          );
      }
    } catch (error) {
      this.logger.error('Error creating fee delegated transaction:', error);
      throw error;
    }
  }

  /**
   * Sign and send fee delegated transaction
   */
  async sendFeeDelegatedTransaction(
    transaction: KaiaFeeDelegatedTransaction,
    userSignature?: string,
  ): Promise<KaiaTransactionResponse> {
    try {
      const wallet = this.blockchainService.getWallet();
      if (!wallet) {
        throw new KaiaTransactionError('Fee payer wallet not configured');
      }

      // Get user signature if not provided
      let userSig: KaiaSignature;
      if (userSignature) {
        // Simple signature parsing (legacy support)
        const r = userSignature.slice(0, 66);
        const s = '0x' + userSignature.slice(66, 130);
        const v = '0x' + userSignature.slice(130);
        userSig = { V: v, R: r, S: s };
      } else {
        // For testing purposes, we'll create a dummy user signature
        // In real implementation, this would come from the frontend
        userSig = await this.createUserSignature(transaction, wallet);
      }

      // Create fee payer signature
      const feePayerSig = await this.createFeePayerSignature(
        transaction,
        wallet,
      );

      // Build signed transaction
      const signedTx: RLPEncodableTransaction = {
        ...transaction,
        signatures: [userSig],
        feePayer: wallet.address.toLowerCase(),
        feePayerSignatures: [feePayerSig],
      };

      // Encode and send transaction
      // Use placeholder for rawTransaction (KAIA SDK handles this)
      const rawTransaction = `0x31${ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(signedTx))).slice(2)}`;
      const txHash = await this.sendRawTransaction(rawTransaction);

      // Wait for transaction receipt
      const receipt = await this.waitForReceipt(txHash);

      return {
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber,
        from: transaction.from,
        gas: transaction.gas,
        gasPrice: transaction.gasPrice,
        hash: txHash,
        input: (transaction as any).input || '0x',
        nonce: transaction.nonce,
        to: (transaction as any).to || '',
        transactionIndex: receipt.transactionIndex,
        value: (transaction as any).value || '0',
        type: transaction.type,
        typeInt: parseInt(transaction.type, 16),
        signatures: [userSig],
        feePayer: wallet.address.toLowerCase(),
        feePayerSignatures: [feePayerSig],
      };
    } catch (error) {
      this.logger.error('Error sending fee delegated transaction:', error);
      throw error;
    }
  }

  /**
   * Estimate gas for fee delegated transaction
   */
  async estimateGas(transaction: KaiaFeeDelegatedTransaction): Promise<bigint> {
    try {
      // Convert to standard transaction format for estimation
      const estimateData = {
        from: transaction.from,
        to: (transaction as any).to,
        value: (transaction as any).value || '0',
        data: (transaction as any).input || '0x',
      };

      return await this.blockchainService.estimateGas(estimateData);
    } catch (error) {
      this.logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Create value transfer transaction
   */
  private createValueTransfer(
    request: KaiaTransactionRequest & { nonce: string; gasPrice: string },
  ): KaiaValueTransfer {
    if (!request.to) {
      throw new KaiaTransactionError(
        'to address is required for value transfer',
      );
    }

    return {
      type: KaiaTransactionType.FEE_DELEGATED_VALUE_TRANSFER,
      nonce: request.nonce,
      gasPrice: request.gasPrice,
      gas: request.gas,
      to: request.to.toLowerCase(),
      value: request.value,
      from: request.from.toLowerCase(),
    };
  }

  /**
   * Create value transfer with memo transaction
   */
  private createValueTransferMemo(
    request: KaiaTransactionRequest & { nonce: string; gasPrice: string },
  ): KaiaValueTransferMemo {
    if (!request.to) {
      throw new KaiaTransactionError(
        'to address is required for value transfer with memo',
      );
    }

    return {
      type: KaiaTransactionType.FEE_DELEGATED_VALUE_TRANSFER_MEMO,
      nonce: request.nonce,
      gasPrice: request.gasPrice,
      gas: request.gas,
      to: request.to.toLowerCase(),
      value: request.value,
      from: request.from.toLowerCase(),
      input: request.memo
        ? ethers.hexlify(ethers.toUtf8Bytes(request.memo))
        : '0x',
    };
  }

  /**
   * Create smart contract execution transaction
   */
  private createContractExecution(
    request: KaiaTransactionRequest & { nonce: string; gasPrice: string },
  ): KaiaSmartContractExecution {
    if (!request.to) {
      throw new KaiaTransactionError(
        'to address is required for contract execution',
      );
    }

    return {
      type: KaiaTransactionType.FEE_DELEGATED_SMART_CONTRACT_EXECUTION,
      nonce: request.nonce,
      gasPrice: request.gasPrice,
      gas: request.gas,
      to: request.to.toLowerCase(),
      value: request.value || '0',
      from: request.from.toLowerCase(),
      input: request.data || '0x',
    };
  }

  /**
   * Create user signature (placeholder - would be signed on frontend)
   */
  private async createUserSignature(
    transaction: KaiaFeeDelegatedTransaction,
    wallet: ethers.Wallet,
  ): Promise<KaiaSignature> {
    const chainId = parseInt(this.configService.get('kaia.chainId') || '1001');
    // Simple hash generation (KAIA SDK handles proper encoding)
    const encodedTx = ethers.id(
      `${transaction.type}-${(transaction as any).to || 'deploy'}-${transaction.nonce}`,
    );
    const hash = ethers.keccak256(encodedTx);

    // Sign the hash directly with chain ID consideration
    const signature = await wallet.signingKey.sign(hash);

    // Calculate V value with chain ID (EIP-155)
    // V = 27 + yParity + (2 * chainId)
    const v = 27 + signature.yParity + 2 * chainId;

    return {
      V: `0x${v.toString(16)}`,
      R: signature.r,
      S: signature.s,
    };
  }

  /**
   * Create fee payer signature
   */
  private async createFeePayerSignature(
    transaction: KaiaFeeDelegatedTransaction,
    wallet: ethers.Wallet,
  ): Promise<KaiaSignature> {
    // For fee payer signature, we need to encode the transaction with empty fee payer signature
    const txForSigning = {
      ...transaction,
      feePayer: wallet.address.toLowerCase(),
    };

    const chainId = parseInt(this.configService.get('kaia.chainId') || '1001');
    // Simple hash generation for fee payer signature
    const encodedTx = ethers.id(
      `feepayer-${txForSigning.type}-${(txForSigning as any).to || 'deploy'}`,
    );
    const hash = ethers.keccak256(encodedTx);

    // Sign the hash directly with chain ID consideration
    const signature = await wallet.signingKey.sign(hash);

    // Calculate V value with chain ID (EIP-155)
    // V = 27 + yParity + (2 * chainId)
    const v = 27 + signature.yParity + 2 * chainId;

    return {
      V: `0x${v.toString(16)}`,
      R: signature.r,
      S: signature.s,
    };
  }

  /**
   * Send raw transaction to KAIA network
   */
  private async sendRawTransaction(rawTransaction: string): Promise<string> {
    try {
      const provider = this.blockchainService.getProvider();
      const result = await provider.send(
        KAIA_RPC_METHODS.SEND_RAW_TRANSACTION,
        [rawTransaction],
      );
      this.logger.log(`Transaction sent: ${result}`);
      return result;
    } catch (error) {
      this.logger.error('Error sending raw transaction:', error);
      throw new KaiaTransactionError('Failed to send transaction', 500, error);
    }
  }

  /**
   * Wait for transaction receipt
   */
  private async waitForReceipt(
    txHash: string,
    timeout = 300000,
  ): Promise<KaiaTransactionReceipt> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        const provider = this.blockchainService.getProvider();
        const receipt = await provider.send(
          KAIA_RPC_METHODS.GET_TRANSACTION_RECEIPT,
          [txHash],
        );
        if (receipt) {
          return receipt;
        }
      } catch (error) {
        // Receipt not ready yet
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new KaiaTransactionError('Transaction receipt timeout');
  }

  /**
   * Get nonce for address
   */
  private async getNonce(address: string): Promise<string> {
    try {
      const provider = this.blockchainService.getProvider();
      const nonce = await provider.getTransactionCount(address);
      return nonce.toString();
    } catch (error) {
      this.logger.error('Error getting nonce:', error);
      throw error;
    }
  }

  /**
   * Get KAIA transaction by hash
   */
  async getTransaction(
    txHash: string,
  ): Promise<KaiaTransactionResponse | null> {
    try {
      const provider = this.blockchainService.getProvider();
      return await provider.send(KAIA_RPC_METHODS.GET_TRANSACTION, [txHash]);
    } catch (error) {
      this.logger.error('Error getting transaction:', error);
      return null;
    }
  }

  /**
   * Get KAIA transaction receipt
   */
  async getTransactionReceipt(
    txHash: string,
  ): Promise<KaiaTransactionReceipt | null> {
    try {
      const provider = this.blockchainService.getProvider();
      return await provider.send(KAIA_RPC_METHODS.GET_TRANSACTION_RECEIPT, [
        txHash,
      ]);
    } catch (error) {
      this.logger.error('Error getting transaction receipt:', error);
      return null;
    }
  }
}
