import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly wallet?: ethers.Wallet;

  constructor(private readonly configService: ConfigService) {
    const rpcUrl = this.configService.get<string>('kaia.rpcUrl');
    const privateKey = this.configService.get<string>('kaia.privateKey');

    this.provider = new ethers.JsonRpcProvider(rpcUrl);

    if (privateKey) {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      this.logger.log('Blockchain service initialized with wallet');
    } else {
      this.logger.warn(
        'Blockchain service initialized without wallet (read-only mode)',
      );
    }
  }

  /**
   * Get current block number
   */
  async getCurrentBlock(): Promise<number> {
    try {
      return await this.provider.getBlockNumber();
    } catch (error) {
      this.logger.error('Error getting current block:', error);
      throw error;
    }
  }

  /**
   * Get KAIA balance for an address
   */
  async getBalance(address: string): Promise<string> {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      this.logger.error(`Error getting balance for ${address}:`, error);
      throw error;
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(
    txHash: string,
  ): Promise<ethers.TransactionResponse | null> {
    try {
      return await this.provider.getTransaction(txHash);
    } catch (error) {
      this.logger.error(`Error getting transaction ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(
    txHash: string,
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.getTransactionReceipt(txHash);
    } catch (error) {
      this.logger.error(`Error getting transaction receipt ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 300000, // 5 minutes
  ): Promise<ethers.TransactionReceipt | null> {
    try {
      return await this.provider.waitForTransaction(
        txHash,
        confirmations,
        timeout,
      );
    } catch (error) {
      this.logger.error(`Error waiting for transaction ${txHash}:`, error);
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: ethers.TransactionRequest): Promise<bigint> {
    try {
      return await this.provider.estimateGas(transaction);
    } catch (error) {
      this.logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    try {
      const feeData = await this.provider.getFeeData();
      return feeData.gasPrice || 0n;
    } catch (error) {
      this.logger.error('Error getting gas price:', error);
      throw error;
    }
  }

  /**
   * Send transaction (requires wallet)
   */
  async sendTransaction(
    transaction: ethers.TransactionRequest,
  ): Promise<ethers.TransactionResponse> {
    if (!this.wallet) {
      throw new Error('Wallet not initialized - cannot send transactions');
    }

    try {
      const tx = await this.wallet.sendTransaction(transaction);
      this.logger.log(`Transaction sent: ${tx.hash}`);
      return tx;
    } catch (error) {
      this.logger.error('Error sending transaction:', error);
      throw error;
    }
  }

  /**
   * Get contract instance
   */
  getContract(address: string, abi: any[]): ethers.Contract {
    if (this.wallet) {
      return new ethers.Contract(address, abi, this.wallet);
    } else {
      return new ethers.Contract(address, abi, this.provider);
    }
  }

  /**
   * Verify message signature
   */
  verifySignature(
    message: string,
    signature: string,
    expectedAddress: string,
  ): boolean {
    try {
      const messageHash = ethers.hashMessage(message);
      const recoveredAddress = ethers.recoverAddress(messageHash, signature);
      return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
    } catch (error) {
      this.logger.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Convert Wei to KAIA
   */
  formatKaia(wei: bigint | string): string {
    return ethers.formatEther(wei);
  }

  /**
   * Convert KAIA to Wei
   */
  parseKaia(kaia: string): bigint {
    return ethers.parseEther(kaia);
  }

  /**
   * Check if address is valid
   */
  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  /**
   * Get network information
   */
  async getNetwork(): Promise<ethers.Network> {
    try {
      return await this.provider.getNetwork();
    } catch (error) {
      this.logger.error('Error getting network:', error);
      throw error;
    }
  }

  /**
   * Get provider for read operations
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Get wallet for write operations (if available)
   */
  getWallet(): ethers.Wallet | undefined {
    return this.wallet;
  }

  /**
   * Get chain ID from configuration
   */
  getChainId(): string {
    return this.configService.get<string>('kaia.chainId', '1001');
  }
}
