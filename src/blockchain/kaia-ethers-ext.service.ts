import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import { KaiaTransactionError, KaiaTransactionResponse } from './kaia-types';

// @kaiachain/ethers-ext import with require for CommonJS compatibility
const { Wallet, TxType, JsonRpcProvider } = require('@kaiachain/ethers-ext/v6');

export interface KaiaExtTransactionRequest {
  from: string;
  to: string;
  value?: string | number;
  data?: string;
  gas?: string;
  gasPrice?: string;
  nonce?: string;
}

/**
 * Service for KAIA fee delegation using official @kaiachain/ethers-ext SDK
 * Based on the official example from KAIA documentation
 */
@Injectable()
export class KaiaEthersExtService {
  private readonly logger = new Logger(KaiaEthersExtService.name);
  private feePayerWallet: any; // KAIA Wallet type

  constructor(private readonly configService: ConfigService) {
    this.initializeFeePayerWallet();
  }

  /**
   * Initialize fee payer wallet using KAIA ethers-ext
   */
  private initializeFeePayerWallet() {
    try {
      const privateKey = this.configService.get<string>('kaia.privateKey');
      const rpcUrl = this.configService.get<string>('kaia.rpcUrl');

      this.logger.debug('Initializing fee payer wallet with config:', {
        privateKeyExists: !!privateKey,
        privateKeyLength: privateKey?.length,
        rpcUrl,
      });

      // Create KAIA-compatible provider directly
      const kaiaProvider = new ethers.JsonRpcProvider(rpcUrl);

      // Create KAIA-specific wallet with proper provider
      this.feePayerWallet = new Wallet(privateKey, kaiaProvider as any);
      this.logger.log(
        `Fee payer wallet initialized: ${this.feePayerWallet.address}`,
      );
    } catch (error) {
      this.logger.error('Failed to initialize fee payer wallet:', error);
      throw new KaiaTransactionError('Fee payer wallet initialization failed');
    }
  }

  /**
   * Create a fee delegated smart contract execution transaction following the official example
   */
  async createFeeDelegatedSmartContractExecution(
    request: KaiaExtTransactionRequest,
  ): Promise<any> {
    try {
      // Create transaction object using KAIA TxType following the official example
      const tx = {
        type: TxType.FeeDelegatedSmartContractExecution,
        from: request.from,
        to: request.to,
        value: request.value || 0,
        data: request.data,
      };

      this.logger.debug('Created KAIA fee delegated transaction:', tx);

      return tx;
    } catch (error) {
      this.logger.error('Error creating fee delegated transaction:', error);
      throw new KaiaTransactionError(
        `Failed to create transaction: ${error.message}`,
      );
    }
  }

  /**
   * Sign transaction as sender and return the TxHashRLP
   * This simulates what the frontend should do
   */
  async signTransactionAsSender(
    transaction: any,
    senderPrivateKey: string,
  ): Promise<string> {
    try {
      const rpcUrl = this.configService.get<string>('kaia.rpcUrl');
      const kaiaProvider = new JsonRpcProvider(rpcUrl);
      const senderWallet = new Wallet(senderPrivateKey, kaiaProvider);

      // Following the official example:
      // 1. Populate the transaction
      const populatedTx = await senderWallet.populateTransaction(transaction);
      this.logger.debug('Populated transaction:', populatedTx);

      // 2. Sign the transaction to get TxHashRLP
      const senderTxHashRLP = await senderWallet.signTransaction(populatedTx);
      this.logger.debug('Sender TxHashRLP:', senderTxHashRLP);

      return senderTxHashRLP;
    } catch (error) {
      this.logger.error('Error signing transaction as sender:', error);
      throw new KaiaTransactionError(
        `Failed to sign as sender: ${error.message}`,
      );
    }
  }

  /**
   * Send transaction as fee payer following the official KAIA example
   */
  async sendTransactionAsFeePayer(
    senderTxHashRLP: string,
  ): Promise<KaiaTransactionResponse> {
    try {
      this.logger.debug(
        `Sending transaction as fee payer with senderTxHashRLP: ${senderTxHashRLP.substring(0, 100)}...`,
      );
      this.logger.debug(`Fee payer address: ${this.feePayerWallet.address}`);

      // Send transaction as fee payer using KAIA SDK method
      const sentTx =
        await this.feePayerWallet.sendTransactionAsFeePayer(senderTxHashRLP);

      this.logger.log(`Transaction sent as fee payer: ${sentTx.hash}`);

      // Wait for receipt
      this.logger.debug('Waiting for transaction receipt...');
      const receipt = await sentTx.wait();

      this.logger.log(`Transaction confirmed in block ${receipt.blockNumber}`);

      return {
        blockHash: receipt.blockHash,
        blockNumber: receipt.blockNumber?.toString() || '0',
        from: receipt.from,
        gas: receipt.gasUsed?.toString() || '0',
        gasPrice: receipt.gasPrice?.toString() || '0',
        hash: sentTx.hash,
        input: '0x',
        nonce: '0',
        to: receipt.to,
        transactionIndex: receipt.index?.toString() || '0',
        value: '0',
        type: receipt.type?.toString() || '0x31',
        typeInt: receipt.type || 49,
        signatures: [],
        feePayer: this.feePayerWallet.address.toLowerCase(),
        feePayerSignatures: [],
      };
    } catch (error) {
      this.logger.error('Error sending transaction as fee payer:', error);
      throw new KaiaTransactionError(
        `Failed to send as fee payer: ${error.message}`,
      );
    }
  }

  /**
   * Complete fee delegation flow following the official KAIA example
   */
  async executeFeeDelegation(
    request: KaiaExtTransactionRequest,
    userSignedTxHashRLP?: string,
  ): Promise<KaiaTransactionResponse> {
    try {
      let senderTxHashRLP: string;

      if (userSignedTxHashRLP) {
        // Use provided TxHashRLP from frontend (signed by user)
        senderTxHashRLP = userSignedTxHashRLP;
        this.logger.debug('Using provided senderTxHashRLP from frontend');
      } else {
        // For testing: create and sign the transaction ourselves
        this.logger.debug(
          'No user signature provided, signing with fee payer key for testing',
        );

        // Step 1: Create the transaction
        const transaction =
          await this.createFeeDelegatedSmartContractExecution(request);

        // Step 2: Sign as sender (using fee payer key for testing - not recommended for production)
        senderTxHashRLP = await this.signTransactionAsSender(
          transaction,
          this.configService.get<string>('kaia.privateKey'),
        );
      }

      // Step 3: Fee payer signs and sends following the official example
      const result = await this.sendTransactionAsFeePayer(senderTxHashRLP);

      return result;
    } catch (error) {
      this.logger.error('Fee delegation execution failed:', error);
      throw error;
    }
  }

  /**
   * Create transaction for frontend signing
   * Returns the transaction object that the frontend should sign
   */
  async createTransactionForSigning(
    request: KaiaExtTransactionRequest,
  ): Promise<any> {
    try {
      // Create the transaction structure that frontend can sign
      const transaction =
        await this.createFeeDelegatedSmartContractExecution(request);

      this.logger.debug(
        'Transaction created for frontend signing:',
        transaction,
      );

      return transaction;
    } catch (error) {
      this.logger.error('Error creating transaction for signing:', error);
      throw error;
    }
  }
}
