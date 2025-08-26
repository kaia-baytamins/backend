import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

import { BlockchainService } from './blockchain.service';
import {
  USDT_ABI,
  USDT_STAKING_ABI,
  LENDING_PROTOCOL_ABI,
  SIMPLE_AMM_ABI,
  USDT_FAUCET_ABI,
  MULTICALL3_ABI,
} from './abis';

const ERC721_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function approve(address to, uint256 tokenId)',
  'event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)',
];

@Injectable()
export class ContractService implements OnModuleInit {
  private readonly logger = new Logger(ContractService.name);

  // Contract instances
  private usdtContract?: ethers.Contract;
  private stakingContract?: ethers.Contract;
  private lendingContract?: ethers.Contract;
  private ammContract?: ethers.Contract;
  private faucetContract?: ethers.Contract;
  private nftContract?: ethers.Contract;
  private marketplaceContract?: ethers.Contract;
  private multicall3Contract?: ethers.Contract;

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
      // Get contract addresses from config
      const usdtAddress = this.configService.get<string>('contracts.usdt');
      const stakingAddress =
        this.configService.get<string>('contracts.staking');
      const lendingAddress =
        this.configService.get<string>('contracts.lending');
      const ammAddress = this.configService.get<string>('contracts.amm');
      const faucetAddress = this.configService.get<string>('contracts.faucet');
      const nftAddress = this.configService.get<string>('contracts.nft');
      const marketplaceAddress = this.configService.get<string>(
        'contracts.marketplace',
      );
      const multicall3Address =
        this.configService.get<string>('contracts.multicall3') ||
        '0x6C75785a346d18b2edB309a4205d6125c63FE551'; // Default deployed address

      // Initialize USDT contract
      if (usdtAddress) {
        this.usdtContract = this.blockchainService.getContract(
          usdtAddress,
          USDT_ABI,
        );
        this.logger.log(`USDT contract initialized at ${usdtAddress}`);
      }

      // Initialize staking contract
      if (stakingAddress) {
        this.stakingContract = this.blockchainService.getContract(
          stakingAddress,
          USDT_STAKING_ABI,
        );
        this.logger.log(`Staking contract initialized at ${stakingAddress}`);
      }

      // Initialize lending contract
      if (lendingAddress) {
        this.lendingContract = this.blockchainService.getContract(
          lendingAddress,
          LENDING_PROTOCOL_ABI,
        );
        this.logger.log(`Lending contract initialized at ${lendingAddress}`);
      }

      // Initialize AMM contract
      if (ammAddress) {
        this.ammContract = this.blockchainService.getContract(
          ammAddress,
          SIMPLE_AMM_ABI,
        );
        this.logger.log(`AMM contract initialized at ${ammAddress}`);
      }

      // Initialize faucet contract
      if (faucetAddress) {
        this.faucetContract = this.blockchainService.getContract(
          faucetAddress,
          USDT_FAUCET_ABI,
        );
        this.logger.log(`Faucet contract initialized at ${faucetAddress}`);
      }

      // Initialize NFT contract
      if (nftAddress) {
        this.nftContract = this.blockchainService.getContract(
          nftAddress,
          ERC721_ABI,
        );
        this.logger.log(`NFT contract initialized at ${nftAddress}`);
      }

      // Initialize marketplace contract
      if (marketplaceAddress) {
        this.logger.log(
          `Marketplace contract address configured: ${marketplaceAddress}`,
        );
      }

      // Initialize Multicall3 contract
      if (multicall3Address) {
        this.multicall3Contract = this.blockchainService.getContract(
          multicall3Address,
          MULTICALL3_ABI,
        );
        this.logger.log(
          `Multicall3 contract initialized at ${multicall3Address}`,
        );
      }
    } catch (error) {
      this.logger.error('Error initializing contracts:', error);
    }
  }

  /**
   * Get USDT contract instance
   */
  getUsdtContract(): ethers.Contract {
    if (!this.usdtContract) {
      throw new Error('USDT contract not initialized');
    }
    return this.usdtContract;
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
   * Get lending contract instance
   */
  getLendingContract(): ethers.Contract {
    if (!this.lendingContract) {
      throw new Error('Lending contract not initialized');
    }
    return this.lendingContract;
  }

  /**
   * Get AMM contract instance
   */
  getAmmContract(): ethers.Contract {
    if (!this.ammContract) {
      throw new Error('AMM contract not initialized');
    }
    return this.ammContract;
  }

  /**
   * Get faucet contract instance
   */
  getFaucetContract(): ethers.Contract {
    if (!this.faucetContract) {
      throw new Error('Faucet contract not initialized');
    }
    return this.faucetContract;
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
   * Get Multicall3 contract instance
   */
  getMulticall3Contract(): ethers.Contract {
    if (!this.multicall3Contract) {
      throw new Error('Multicall3 contract not initialized');
    }
    return this.multicall3Contract;
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
