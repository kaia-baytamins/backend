import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';

import { BlockchainService } from './blockchain.service';
import { ContractService } from './contract.service';
import { KaiaTransactionType, KaiaSmartContractExecution } from './kaia-types';

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

export interface DefiTransactionData {
  to: string;
  data: string;
  gas: string;
  gasPrice: string;
  value: string;
  type: 'contract_execution';
  messageToSign: string;
}

export interface DefiTransactionResponse {
  success: boolean;
  transactionData?: DefiTransactionData;
  message: string;
  instructions?: {
    step1: string;
    step2: string;
    step3: string;
  };
  error?: string;
}

export interface Call3 {
  target: string;
  allowFailure: boolean;
  callData: string;
}

export interface MulticallResult {
  success: boolean;
  returnData: string;
}

@Injectable()
export class DefiService {
  private readonly logger = new Logger(DefiService.name);

  /**
   * Utility method for gas estimation using direct KAIA RPC call
   */
  private async estimateGasWithRPC(
    checksumUserAddress: string,
    contractAddress: string,
    data: string,
    gasPrice: bigint,
  ): Promise<bigint> {
    const provider = this.blockchainService.getProvider();

    const gasEstimateHex = await provider.send('kaia_estimateGas', [
      {
        from: checksumUserAddress,
        to: contractAddress,
        gas: '0x100000', // 1M gas limit for estimation
        gasPrice: `0x${gasPrice.toString(16)}`,
        value: '0x0',
        data: data,
      },
    ]);

    return BigInt(gasEstimateHex);
  }

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly contractService: ContractService,
    private readonly configService: ConfigService,
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
   * Prepare staking transaction data for user signing
   */
  async prepareStakeTransaction(
    userAddress: string,
    amount: string,
  ): Promise<DefiTransactionData> {
    try {
      const stakingContract = this.contractService.getStakingContract();
      const usdtContract = this.contractService.getUsdtContract();
      const amountWei = this.blockchainService.parseKaia(amount);

      // Ensure proper checksum address format
      const checksumUserAddress = ethers.getAddress(userAddress);

      // Check current allowance
      const stakingAddress = await stakingContract.getAddress();
      const currentAllowance = await usdtContract.allowance(
        checksumUserAddress,
        stakingAddress,
      );

      // If allowance is insufficient, return approval transaction
      if (currentAllowance < amountWei) {
        const usdtContractInterface = usdtContract.interface;
        const approvalData = usdtContractInterface.encodeFunctionData(
          'approve',
          [stakingAddress, amountWei],
        );

        const gasPrice = await this.blockchainService.getGasPrice();
        const usdtAddress = await usdtContract.getAddress();
        const gasEstimate = await this.estimateGasWithRPC(
          checksumUserAddress,
          usdtAddress,
          approvalData,
          gasPrice,
        );

        this.logger.log(
          `Prepared USDT approval transaction for ${userAddress}: ${amount} tokens for staking`,
        );

        const transactionData: Omit<DefiTransactionData, 'messageToSign'> = {
          to: await usdtContract.getAddress(),
          data: approvalData,
          gas: ((gasEstimate * 110n) / 100n).toString(), // Add 10% buffer
          gasPrice: gasPrice.toString(),
          value: '0',
          type: 'contract_execution',
        };

        return {
          ...transactionData,
          messageToSign: await this.createSigningMessage(
            transactionData,
            userAddress,
          ),
        };
      }

      // If allowance is sufficient, return staking transaction
      const stakingContractInterface = stakingContract.interface;
      const data = stakingContractInterface.encodeFunctionData('stake', [
        amountWei,
      ]);

      // Get gas price and estimate gas using utility function
      const gasPrice = await this.blockchainService.getGasPrice();
      const gasEstimate = await this.estimateGasWithRPC(
        checksumUserAddress,
        stakingAddress,
        data,
        gasPrice,
      );

      this.logger.log(
        `Prepared stake transaction for ${userAddress}: ${amount} tokens`,
      );

      const transactionData: Omit<DefiTransactionData, 'messageToSign'> = {
        to: await stakingContract.getAddress(),
        data: data,
        gas: ((gasEstimate * 110n) / 100n).toString(), // Add 10% buffer
        gasPrice: gasPrice.toString(),
        value: '0',
        type: 'contract_execution',
      };

      return {
        ...transactionData,
        messageToSign: await this.createSigningMessage(
          transactionData,
          userAddress,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error preparing stake transaction for ${userAddress}:`,
        error,
      );
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
   * Prepare lending supply transaction data for user signing
   */
  async prepareLendingSupplyTransaction(
    userAddress: string,
    amount: string,
  ): Promise<DefiTransactionData> {
    try {
      const lendingContract = this.contractService.getLendingContract();
      const usdtContract = this.contractService.getUsdtContract();
      const amountWei = this.blockchainService.parseKaia(amount);

      // Ensure proper checksum address format
      const checksumUserAddress = ethers.getAddress(userAddress);

      // Check current allowance
      const lendingAddress = await lendingContract.getAddress();
      const currentAllowance = await usdtContract.allowance(
        checksumUserAddress,
        lendingAddress,
      );

      // If allowance is insufficient, return approval transaction
      if (currentAllowance < amountWei) {
        const usdtContractInterface = usdtContract.interface;
        const approvalData = usdtContractInterface.encodeFunctionData(
          'approve',
          [lendingAddress, amountWei],
        );

        const gasPrice = await this.blockchainService.getGasPrice();
        const usdtAddress = await usdtContract.getAddress();
        const gasEstimate = await this.estimateGasWithRPC(
          checksumUserAddress,
          usdtAddress,
          approvalData,
          gasPrice,
        );

        this.logger.log(
          `Prepared USDT approval transaction for ${userAddress}: ${amount} tokens for lending supply`,
        );

        const transactionData: Omit<DefiTransactionData, 'messageToSign'> = {
          to: await usdtContract.getAddress(),
          data: approvalData,
          gas: ((gasEstimate * 110n) / 100n).toString(), // Add 10% buffer
          gasPrice: gasPrice.toString(),
          value: '0',
          type: 'contract_execution',
        };

        return {
          ...transactionData,
          messageToSign: await this.createSigningMessage(
            transactionData,
            userAddress,
          ),
        };
      }

      // If allowance is sufficient, return supply transaction
      const lendingContractInterface = lendingContract.interface;
      const data = lendingContractInterface.encodeFunctionData('supply', [
        amountWei,
      ]);

      // Get gas price and estimate gas using utility function
      const gasPrice = await this.blockchainService.getGasPrice();
      const gasEstimate = await this.estimateGasWithRPC(
        checksumUserAddress,
        lendingAddress,
        data,
        gasPrice,
      );

      this.logger.log(
        `Prepared lending supply transaction for ${userAddress}: ${amount} tokens`,
      );

      const transactionData: Omit<DefiTransactionData, 'messageToSign'> = {
        to: await lendingContract.getAddress(),
        data: data,
        gas: ((gasEstimate * 110n) / 100n).toString(), // Add 10% buffer
        gasPrice: gasPrice.toString(),
        value: '0',
        type: 'contract_execution',
      };

      return {
        ...transactionData,
        messageToSign: await this.createSigningMessage(
          transactionData,
          userAddress,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error preparing lending supply transaction for ${userAddress}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Prepare AMM liquidity transaction data for user signing
   */
  async prepareAmmLiquidityTransaction(
    userAddress: string,
    amountA: string,
    amountB: string,
  ): Promise<DefiTransactionData> {
    try {
      const ammContract = this.contractService.getAmmContract();
      const amountAWei = this.blockchainService.parseKaia(amountA);
      const amountBWei = this.blockchainService.parseKaia(amountB);

      // Ensure proper checksum address format
      const checksumUserAddress = ethers.getAddress(userAddress);

      // Create transaction data for AMM liquidity
      const ammContractInterface = ammContract.interface;
      const data = ammContractInterface.encodeFunctionData('addLiquidity', [
        amountAWei,
        amountBWei,
      ]);

      // Get gas price and estimate gas using utility function
      const gasPrice = await this.blockchainService.getGasPrice();
      const ammAddress = await ammContract.getAddress();
      const gasEstimate = await this.estimateGasWithRPC(
        checksumUserAddress,
        ammAddress,
        data,
        gasPrice,
      );

      this.logger.log(
        `Prepared AMM liquidity transaction for ${userAddress}: ${amountA}/${amountB}`,
      );

      const transactionData: Omit<DefiTransactionData, 'messageToSign'> = {
        to: await ammContract.getAddress(),
        data: data,
        gas: ((gasEstimate * 110n) / 100n).toString(), // Add 10% buffer
        gasPrice: gasPrice.toString(),
        value: '0',
        type: 'contract_execution',
      };

      return {
        ...transactionData,
        messageToSign: await this.createSigningMessage(
          transactionData,
          userAddress,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error preparing AMM liquidity transaction for ${userAddress}:`,
        error,
      );
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

      let tx: any;
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
   * Prepare faucet transaction data for user signing
   */
  async prepareFaucetTransaction(
    userAddress: string,
  ): Promise<DefiTransactionData> {
    try {
      const faucetContract = this.contractService.getFaucetContract();

      // Ensure proper checksum address format
      const checksumUserAddress = ethers.getAddress(userAddress);

      const canRequest =
        await faucetContract.canRequestTokens(checksumUserAddress);
      if (!canRequest) {
        throw new Error('Faucet cooldown period not yet passed');
      }

      // Create transaction data for faucet request
      const faucetContractInterface = faucetContract.interface;
      const data = faucetContractInterface.encodeFunctionData(
        'requestTokensFor',
        [checksumUserAddress],
      );

      // Get gas price and estimate gas using utility function
      const gasPrice = await this.blockchainService.getGasPrice();
      const faucetAddress = await faucetContract.getAddress();
      const gasEstimate = await this.estimateGasWithRPC(
        checksumUserAddress,
        faucetAddress,
        data,
        gasPrice,
      );

      this.logger.log(`Prepared faucet transaction for ${userAddress}`);

      const transactionData: Omit<DefiTransactionData, 'messageToSign'> = {
        to: await faucetContract.getAddress(),
        data: data,
        gas: ((gasEstimate * 110n) / 100n).toString(), // Add 10% buffer
        gasPrice: gasPrice.toString(),
        value: '0',
        type: 'contract_execution',
      };

      return {
        ...transactionData,
        messageToSign: await this.createSigningMessage(
          transactionData,
          userAddress,
        ),
      };
    } catch (error) {
      this.logger.error(
        `Error preparing faucet transaction for ${userAddress}:`,
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
   * Get USDT allowance for a specific spender
   */
  async getUsdtAllowance(
    userAddress: string,
    spenderAddress: string,
  ): Promise<string> {
    try {
      const usdtContract = this.contractService.getUsdtContract();
      const allowance = await usdtContract.allowance(
        userAddress,
        spenderAddress,
      );
      return this.blockchainService.formatKaia(allowance);
    } catch (error) {
      this.logger.error(
        `Error getting USDT allowance for ${userAddress} -> ${spenderAddress}:`,
        error,
      );
      return '0';
    }
  }

  /**
   * Check if user needs to approve USDT for staking
   */
  async checkStakingApprovalNeeded(
    userAddress: string,
    amount: string,
  ): Promise<{
    needsApproval: boolean;
    currentAllowance: string;
    requiredAmount: string;
  }> {
    try {
      const stakingContract = this.contractService.getStakingContract();
      const stakingAddress = await stakingContract.getAddress();
      const currentAllowance = await this.getUsdtAllowance(
        userAddress,
        stakingAddress,
      );
      const amountWei = this.blockchainService.parseKaia(amount);
      const allowanceWei = this.blockchainService.parseKaia(currentAllowance);

      return {
        needsApproval: allowanceWei < amountWei,
        currentAllowance,
        requiredAmount: amount,
      };
    } catch (error) {
      this.logger.error(
        `Error checking staking approval for ${userAddress}:`,
        error,
      );
      return {
        needsApproval: true,
        currentAllowance: '0',
        requiredAmount: amount,
      };
    }
  }

  /**
   * Check if user needs to approve USDT for lending supply
   */
  async checkLendingApprovalNeeded(
    userAddress: string,
    amount: string,
  ): Promise<{
    needsApproval: boolean;
    currentAllowance: string;
    requiredAmount: string;
  }> {
    try {
      const lendingContract = this.contractService.getLendingContract();
      const lendingAddress = await lendingContract.getAddress();
      const currentAllowance = await this.getUsdtAllowance(
        userAddress,
        lendingAddress,
      );
      const amountWei = this.blockchainService.parseKaia(amount);
      const allowanceWei = this.blockchainService.parseKaia(currentAllowance);

      return {
        needsApproval: allowanceWei < amountWei,
        currentAllowance,
        requiredAmount: amount,
      };
    } catch (error) {
      this.logger.error(
        `Error checking lending approval for ${userAddress}:`,
        error,
      );
      return {
        needsApproval: true,
        currentAllowance: '0',
        requiredAmount: amount,
      };
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

  /**
   * Execute a multicall transaction and parse results
   */
  async executeMulticall(
    calls: Call3[],
    userAddress: string,
  ): Promise<MulticallResult[]> {
    try {
      const multicall3Contract = this.contractService.getMulticall3Contract();

      const results = await multicall3Contract.aggregate3(calls);

      this.logger.log(
        `Executed multicall for ${userAddress} with ${calls.length} calls`,
      );

      return results.map((result: any) => ({
        success: result.success,
        returnData: result.returnData,
      }));
    } catch (error) {
      this.logger.error(`Error executing multicall for ${userAddress}:`, error);
      throw error;
    }
  }

  /**
   * Create a simple signing message for KAIA transactions
   * This avoids complex RLP encoding on frontend
   */
  private async createSigningMessage(
    transactionData: any,
    userAddress: string,
  ): Promise<string> {
    try {
      // Get the actual nonce for the user address to ensure consistency
      const provider = this.blockchainService.getProvider();
      const currentNonce = await provider.getTransactionCount(userAddress);

      // Create the KAIA transaction object for signing with actual nonce
      const kaiaTransaction: KaiaSmartContractExecution = {
        type: KaiaTransactionType.FEE_DELEGATED_SMART_CONTRACT_EXECUTION,
        nonce: `0x${currentNonce.toString(16)}`, // Use actual current nonce
        gasPrice: transactionData.gasPrice,
        gas: transactionData.gas,
        to: transactionData.to.toLowerCase(),
        value: transactionData.value || '0',
        from: userAddress.toLowerCase(),
        input: transactionData.data || '0x',
      };

      try {
        // Use the KAIA RLP service to encode the transaction for signing
        const chainId = parseInt(
          this.configService.get('kaia.chainId') || '1001',
        );
        this.logger.debug('About to encode transaction for signing:', {
          kaiaTransaction,
          chainId,
        });

        // Use simple hash instead of complex RLP encoding
        const hash = ethers.id(
          `${kaiaTransaction.type}-${kaiaTransaction.to}-${kaiaTransaction.nonce}`,
        );

        this.logger.debug(
          'Successfully generated transaction hash for signing:',
          {
            hash,
            chainId,
            userAddress: userAddress.toLowerCase(),
            actualNonce: `0x${currentNonce.toString(16)}`,
          },
        );

        return hash;
      } catch (error) {
        this.logger.error('Error creating transaction hash for signing:', {
          error: error.message,
          stack: error.stack,
          kaiaTransaction,
        });
        // Fallback to simple message if hash generation fails
        const message = `KAIA Transaction Signing
From: ${userAddress.toLowerCase()}
To: ${transactionData.to.toLowerCase()}
Value: ${transactionData.value}
Gas: ${transactionData.gas}
GasPrice: ${transactionData.gasPrice}
Data: ${transactionData.data}
Type: ${transactionData.type}
Nonce: ${currentNonce}
ChainId: 1001`;

        return message;
      }
    } catch (error) {
      this.logger.error('Error getting nonce for signing message:', error);
      // Ultimate fallback without nonce
      return `KAIA Transaction Signing\nFrom: ${userAddress.toLowerCase()}\nTo: ${transactionData.to.toLowerCase()}\nValue: ${transactionData.value || '0'}`;
    }
  }
}
