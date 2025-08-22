import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';

import { BlockchainService } from './blockchain.service';
import { ContractService } from './contract.service';

export interface UserDefiPortfolio {
  totalValue: string;
  staking: {
    amount: string;
    pendingRewards: string;
    apy: string;
  };
  lending: {
    supplied: string;
    borrowed: string;
    collateral: string;
    healthFactor: string;
  };
  amm: {
    liquidityProvided: string;
    liquidityTokens: string;
    fees24h: string;
  };
}

export interface StakingInfo {
  amount: string;
  pendingRewards: string;
  apy: string;
}

export interface LendingInfo {
  supplied: string;
  borrowed: string;
  collateral: string;
  healthFactor: string;
}

export interface AmmInfo {
  liquidityProvided: string;
  liquidityTokens: string;
  fees24h: string;
}

export interface DefiStats {
  totalValueLocked: string;
  totalStaked: string;
  totalSupplied: string;
  totalBorrowed: string;
  ammReserveA: string;
  ammReserveB: string;
}

@Injectable()
export class DefiService {
  private readonly logger = new Logger(DefiService.name);

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly contractService: ContractService,
  ) {}

  /**
   * Get user's complete DeFi portfolio
   */
  async getUserPortfolio(userAddress: string): Promise<UserDefiPortfolio> {
    try {
      const [stakingInfo, lendingInfo, ammInfo] = await Promise.all([
        this.getStakingInfo(userAddress),
        this.getLendingInfo(userAddress),
        this.getAmmInfo(userAddress),
      ]);

      const totalValue = this.calculateTotalPortfolioValue(
        stakingInfo,
        lendingInfo,
        ammInfo,
      );

      return {
        totalValue,
        staking: stakingInfo,
        lending: lendingInfo,
        amm: ammInfo,
      };
    } catch (error) {
      this.logger.error(`Error getting portfolio for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Get user's staking information
   */
  async getStakingInfo(userAddress: string): Promise<StakingInfo> {
    try {
      const stakingContract = this.contractService.getStakingContract();

      const [stakeInfo, apy] = await Promise.all([
        stakingContract.getStakeInfo(userAddress),
        stakingContract.APY(),
      ]);

      return {
        amount: this.blockchainService.formatKaia(stakeInfo.amount),
        pendingRewards: this.blockchainService.formatKaia(
          stakeInfo.pendingReward,
        ),
        apy: apy.toString(),
      };
    } catch (error) {
      this.logger.error(
        `Error getting staking info for ${userAddress}:`,
        error,
      );
      return {
        amount: '0',
        pendingRewards: '0',
        apy: '0',
      };
    }
  }

  /**
   * Get user's lending information
   */
  async getLendingInfo(userAddress: string): Promise<LendingInfo> {
    try {
      const lendingContract = this.contractService.getLendingContract();

      const accountInfo = await lendingContract.getAccountInfo(userAddress);

      // Calculate health factor
      let healthFactor = '0';
      if (accountInfo.borrowed > 0 && accountInfo.collateral > 0) {
        const collateralValue = accountInfo.collateral * 3000n; // ETH price in USDT
        const borrowedValue =
          accountInfo.borrowed + accountInfo.pendingBorrowInterest;
        healthFactor = ((collateralValue * 100n) / borrowedValue).toString();
      }

      return {
        supplied: this.blockchainService.formatKaia(accountInfo.supplied),
        borrowed: this.blockchainService.formatKaia(accountInfo.borrowed),
        collateral: ethers.formatEther(accountInfo.collateral),
        healthFactor: (parseFloat(healthFactor) / 100).toString(),
      };
    } catch (error) {
      this.logger.error(
        `Error getting lending info for ${userAddress}:`,
        error,
      );
      return {
        supplied: '0',
        borrowed: '0',
        collateral: '0',
        healthFactor: '0',
      };
    }
  }

  /**
   * Get user's AMM information
   */
  async getAmmInfo(userAddress: string): Promise<AmmInfo> {
    try {
      const ammContract = this.contractService.getAmmContract();

      const [userLiquidity, reserves, totalLiquidity] = await Promise.all([
        ammContract.getUserLiquidity(userAddress),
        ammContract.getReserves(),
        ammContract.totalLiquidity(),
      ]);

      // Calculate user's share of liquidity
      let liquidityProvided = '0';
      if (totalLiquidity > 0 && userLiquidity > 0) {
        const share = (userLiquidity * 100n) / totalLiquidity;
        const totalReserveValue = reserves._reserveA + reserves._reserveB;
        liquidityProvided = this.blockchainService.formatKaia(
          (totalReserveValue * share) / 100n,
        );
      }

      return {
        liquidityProvided,
        liquidityTokens: userLiquidity.toString(),
        fees24h: '0', // Would need historical data to calculate
      };
    } catch (error) {
      this.logger.error(`Error getting AMM info for ${userAddress}:`, error);
      return {
        liquidityProvided: '0',
        liquidityTokens: '0',
        fees24h: '0',
      };
    }
  }

  /**
   * Get platform DeFi statistics
   */
  async getDefiStats(): Promise<DefiStats> {
    try {
      const [stakingContract, lendingContract, ammContract] = await Promise.all(
        [
          this.contractService.getStakingContract(),
          this.contractService.getLendingContract(),
          this.contractService.getAmmContract(),
        ],
      );

      const [stakingStats, lendingStats, ammReserves] = await Promise.all([
        stakingContract.getTotalStats(),
        Promise.all([
          lendingContract.totalSupplied(),
          lendingContract.totalBorrowed(),
        ]),
        ammContract.getReserves(),
      ]);

      const totalValueLocked =
        stakingStats._totalStaked +
        lendingStats[0] + // totalSupplied
        ammReserves._reserveA +
        ammReserves._reserveB;

      return {
        totalValueLocked: this.blockchainService.formatKaia(totalValueLocked),
        totalStaked: this.blockchainService.formatKaia(
          stakingStats._totalStaked,
        ),
        totalSupplied: this.blockchainService.formatKaia(lendingStats[0]),
        totalBorrowed: this.blockchainService.formatKaia(lendingStats[1]),
        ammReserveA: this.blockchainService.formatKaia(ammReserves._reserveA),
        ammReserveB: this.blockchainService.formatKaia(ammReserves._reserveB),
      };
    } catch (error) {
      this.logger.error('Error getting DeFi stats:', error);
      throw error;
    }
  }

  /**
   * Stake USDT tokens
   */
  async stakeTokens(userAddress: string, amount: string): Promise<string> {
    try {
      const stakingContract = this.contractService.getStakingContract();
      const amountWei = this.blockchainService.parseKaia(amount);

      // This would require user's signature in a real implementation
      const tx = await stakingContract.stake(amountWei);
      await tx.wait();

      this.logger.log(`User ${userAddress} staked ${amount} tokens`);
      return tx.hash;
    } catch (error) {
      this.logger.error(`Error staking tokens for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Unstake USDT tokens
   */
  async unstakeTokens(userAddress: string, amount: string): Promise<string> {
    try {
      const stakingContract = this.contractService.getStakingContract();
      const amountWei = this.blockchainService.parseKaia(amount);

      const tx = await stakingContract.unstake(amountWei);
      await tx.wait();

      this.logger.log(`User ${userAddress} unstaked ${amount} tokens`);
      return tx.hash;
    } catch (error) {
      this.logger.error(`Error unstaking tokens for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Supply tokens to lending protocol
   */
  async supplyToLending(userAddress: string, amount: string): Promise<string> {
    try {
      const lendingContract = this.contractService.getLendingContract();
      const amountWei = this.blockchainService.parseKaia(amount);

      const tx = await lendingContract.supply(amountWei);
      await tx.wait();

      this.logger.log(
        `User ${userAddress} supplied ${amount} tokens to lending`,
      );
      return tx.hash;
    } catch (error) {
      this.logger.error(
        `Error supplying to lending for ${userAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Add liquidity to AMM
   */
  async addLiquidityToAmm(
    userAddress: string,
    amountA: string,
    amountB: string,
  ): Promise<string> {
    try {
      const ammContract = this.contractService.getAmmContract();
      const amountAWei = this.blockchainService.parseKaia(amountA);
      const amountBWei = this.blockchainService.parseKaia(amountB);

      const tx = await ammContract.addLiquidity(amountAWei, amountBWei);
      await tx.wait();

      this.logger.log(
        `User ${userAddress} added liquidity: ${amountA}/${amountB}`,
      );
      return tx.hash;
    } catch (error) {
      this.logger.error(`Error adding liquidity for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Calculate swap output amount
   */
  async getSwapOutput(tokenIn: 'A' | 'B', amountIn: string): Promise<string> {
    try {
      const ammContract = this.contractService.getAmmContract();
      const reserves = await ammContract.getReserves();
      const amountInWei = this.blockchainService.parseKaia(amountIn);

      let amountOut: bigint;
      if (tokenIn === 'A') {
        amountOut = await ammContract.getAmountOut(
          amountInWei,
          reserves._reserveA,
          reserves._reserveB,
        );
      } else {
        amountOut = await ammContract.getAmountOut(
          amountInWei,
          reserves._reserveB,
          reserves._reserveA,
        );
      }

      return this.blockchainService.formatKaia(amountOut);
    } catch (error) {
      this.logger.error(`Error calculating swap output:`, error);
      throw error;
    }
  }

  /**
   * Perform token swap
   */
  async swapTokens(
    userAddress: string,
    tokenIn: 'A' | 'B',
    amountIn: string,
  ): Promise<string> {
    try {
      const ammContract = this.contractService.getAmmContract();
      const amountInWei = this.blockchainService.parseKaia(amountIn);

      let tx;
      if (tokenIn === 'A') {
        tx = await ammContract.swapAForB(amountInWei);
      } else {
        tx = await ammContract.swapBForA(amountInWei);
      }

      await tx.wait();

      this.logger.log(
        `User ${userAddress} swapped ${amountIn} token ${tokenIn}`,
      );
      return tx.hash;
    } catch (error) {
      this.logger.error(`Error swapping tokens for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Request tokens from faucet
   */
  async requestFaucetTokens(userAddress: string): Promise<string> {
    try {
      const faucetContract = this.contractService.getFaucetContract();

      const canRequest = await faucetContract.canRequestTokens(userAddress);
      if (!canRequest) {
        throw new Error('Faucet cooldown period not yet passed');
      }

      const tx = await faucetContract.requestTokensFor(userAddress);
      await tx.wait();

      this.logger.log(`Faucet tokens requested for ${userAddress}`);
      return tx.hash;
    } catch (error) {
      this.logger.error(
        `Error requesting faucet tokens for ${userAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Get USDT balance
   */
  async getUsdtBalance(userAddress: string): Promise<string> {
    try {
      const usdtContract = this.contractService.getUsdtContract();
      const balance = await usdtContract.balanceOf(userAddress);
      return this.blockchainService.formatKaia(balance);
    } catch (error) {
      this.logger.error(
        `Error getting USDT balance for ${userAddress}:`,
        error,
      );
      return '0';
    }
  }

  /**
   * Calculate total portfolio value in USD
   */
  private calculateTotalPortfolioValue(
    staking: any,
    lending: any,
    amm: any,
  ): string {
    try {
      const stakingValue =
        parseFloat(staking.amount) + parseFloat(staking.pendingRewards);
      const lendingValue =
        parseFloat(lending.supplied) - parseFloat(lending.borrowed);
      const ammValue = parseFloat(amm.liquidityProvided);

      const totalValue = stakingValue + lendingValue + ammValue;
      return totalValue.toFixed(2);
    } catch (error) {
      this.logger.error('Error calculating total portfolio value:', error);
      return '0';
    }
  }
}
