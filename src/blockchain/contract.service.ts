import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

import { BlockchainService } from './blockchain.service';

// Basic ABI definitions for common contract interactions
// ERC20 ABI for future use
// const ERC20_ABI = [
//   'function balanceOf(address owner) view returns (uint256)',
//   'function transfer(address to, uint256 amount) returns (bool)',
//   'function allowance(address owner, address spender) view returns (uint256)',
//   'function approve(address spender, uint256 amount) returns (bool)',
//   'event Transfer(address indexed from, address indexed to, uint256 value)',
// ];

const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

// Sample staking contract ABI
const STAKING_ABI = [
  'function stake(uint256 amount)',
  'function unstake(uint256 amount)',
  'function getStakedAmount(address user) view returns (uint256)',
  'function getRewards(address user) view returns (uint256)',
  'function claimRewards()',
  'event Staked(address indexed user, uint256 amount)',
  'event Unstaked(address indexed user, uint256 amount)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
];

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly logger = new Logger(ContractService.name);
  private stakingContract?: ethers.Contract;
  private nftContract?: ethers.Contract;
  private marketplaceContract?: ethers.Contract;

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeContracts();
  }

  /**
   * Initialize smart contracts
   */
  private async initializeContracts(): Promise<void> {
    try {
      const stakingAddress =
        this.configService.get<string>('contracts.staking');
      const nftAddress = this.configService.get<string>('contracts.nft');
      const marketplaceAddress = this.configService.get<string>(
        'contracts.marketplace',
      );

      if (stakingAddress) {
        this.stakingContract = this.blockchainService.getContract(
          stakingAddress,
          STAKING_ABI,
        );
        this.logger.log(`Staking contract initialized at ${stakingAddress}`);
      }

      if (nftAddress) {
        this.nftContract = this.blockchainService.getContract(
          nftAddress,
          ERC721_ABI,
        );
        this.logger.log(`NFT contract initialized at ${nftAddress}`);
      }

      if (marketplaceAddress) {
        // Marketplace contract would have its own ABI
        this.logger.log(
          `Marketplace contract address configured: ${marketplaceAddress}`,
        );
      }
    } catch (error) {
      this.logger.error('Error initializing contracts:', error);
    }
  }

  /**
   * Get staking contract instance
   */
  getStakingContract(): ethers.Contract {
    if (!this.stakingContract) {
      throw new Error('Staking contract not initialized');
    }
    return this.stakingContract;
  }

  /**
   * Get NFT contract instance
   */
  getNftContract(): ethers.Contract {
    if (!this.nftContract) {
      throw new Error('NFT contract not initialized');
    }
    return this.nftContract;
  }

  /**
   * Get user's staked amount
   */
  async getStakedAmount(userAddress: string): Promise<string> {
    try {
      if (!this.stakingContract) {
        throw new Error('Staking contract not initialized');
      }

      const stakedAmount =
        await this.stakingContract.getStakedAmount(userAddress);
      return this.blockchainService.formatKaia(stakedAmount);
    } catch (error) {
      this.logger.error(
        `Error getting staked amount for ${userAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get user's pending rewards
   */
  async getPendingRewards(userAddress: string): Promise<string> {
    try {
      if (!this.stakingContract) {
        throw new Error('Staking contract not initialized');
      }

      const rewards = await this.stakingContract.getRewards(userAddress);
      return this.blockchainService.formatKaia(rewards);
    } catch (error) {
      this.logger.error(`Error getting rewards for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get NFT balance for user
   */
  async getNftBalance(userAddress: string): Promise<number> {
    try {
      if (!this.nftContract) {
        throw new Error('NFT contract not initialized');
      }

      const balance = await this.nftContract.balanceOf(userAddress);
      return Number(balance);
    } catch (error) {
      this.logger.error(`Error getting NFT balance for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get NFT token URI
   */
  async getNftTokenUri(tokenId: string): Promise<string> {
    try {
      if (!this.nftContract) {
        throw new Error('NFT contract not initialized');
      }

      return await this.nftContract.tokenURI(tokenId);
    } catch (error) {
      this.logger.error(`Error getting token URI for ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Get NFT owner
   */
  async getNftOwner(tokenId: string): Promise<string> {
    try {
      if (!this.nftContract) {
        throw new Error('NFT contract not initialized');
      }

      return await this.nftContract.ownerOf(tokenId);
    } catch (error) {
      this.logger.error(`Error getting owner for token ${tokenId}:`, error);
      throw error;
    }
  }

  /**
   * Listen to staking events
   */
  async listenToStakingEvents(callback: (event: any) => void): Promise<void> {
    if (!this.stakingContract) {
      throw new Error('Staking contract not initialized');
    }

    this.stakingContract.on('Staked', (user, amount, event) => {
      this.logger.log(`Staking event: ${user} staked ${amount}`);
      callback({
        type: 'staked',
        user,
        amount: this.blockchainService.formatKaia(amount),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    });

    this.stakingContract.on('Unstaked', (user, amount, event) => {
      this.logger.log(`Unstaking event: ${user} unstaked ${amount}`);
      callback({
        type: 'unstaked',
        user,
        amount: this.blockchainService.formatKaia(amount),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    });

    this.stakingContract.on('RewardsClaimed', (user, amount, event) => {
      this.logger.log(`Rewards claimed: ${user} claimed ${amount}`);
      callback({
        type: 'rewards_claimed',
        user,
        amount: this.blockchainService.formatKaia(amount),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    });
  }

  /**
   * Listen to NFT transfer events
   */
  async listenToNftEvents(callback: (event: any) => void): Promise<void> {
    if (!this.nftContract) {
      throw new Error('NFT contract not initialized');
    }

    this.nftContract.on('Transfer', (from, to, tokenId, event) => {
      this.logger.log(`NFT Transfer: ${tokenId} from ${from} to ${to}`);
      callback({
        type: 'transfer',
        from,
        to,
        tokenId: tokenId.toString(),
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
      });
    });
  }

  /**
   * Get past events from a contract
   */
  async getPastEvents(
    contractAddress: string,
    abi: string[],
    eventName: string,
    fromBlock: number = 0,
    toBlock: number | 'latest' = 'latest',
  ): Promise<any[]> {
    try {
      const contract = this.blockchainService.getContract(contractAddress, abi);
      const filter = contract.filters[eventName]();

      return await contract.queryFilter(filter, fromBlock, toBlock);
    } catch (error) {
      this.logger.error(`Error getting past events for ${eventName}:`, error);
      throw error;
    }
  }

  /**
   * Call a read-only contract function
   */
  async callContractFunction(
    contractAddress: string,
    abi: string[],
    functionName: string,
    params: any[] = [],
  ): Promise<any> {
    try {
      const contract = this.blockchainService.getContract(contractAddress, abi);
      return await contract[functionName](...params);
    } catch (error) {
      this.logger.error(`Error calling ${functionName}:`, error);
      throw error;
    }
  }

  /**
   * Check if contract exists at address
   */
  async isContract(address: string): Promise<boolean> {
    try {
      const provider = this.blockchainService.getProvider();
      const code = await provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      this.logger.error(`Error checking if ${address} is contract:`, error);
      return false;
    }
  }

  /**
   * Get contract deployment block (simplified implementation)
   */
  async getContractDeploymentBlock(
    contractAddress: string,
  ): Promise<number | null> {
    try {
      // This is a placeholder implementation
      // In production, you would use external APIs or indexing services
      // to find contract deployment blocks efficiently
      this.logger.log(
        `Contract deployment block lookup for ${contractAddress} would be implemented here`,
      );
      return null;
    } catch (error) {
      this.logger.error(
        `Error finding deployment block for ${contractAddress}:`,
        error,
      );
      return null;
    }
  }
}
