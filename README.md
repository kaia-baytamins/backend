# UchuMon Backend

**NestJS-based Animal Space Exploration DeFi Game Backend API Server**

## 🌟 Project Overview

UchuMon Backend is a backend API server for an animal partner space exploration DeFi game, providing animal growth management, spaceship enhancement, planet exploration, NFT minting, DeFi integration, and **Kaia blockchain Fee Delegation services**.

### Key Features

- **🐾 Animal Partner System**: Momoco, Panlulu, Hoshitanu, Mizuru character management and stats system
- **🚀 Spaceship Management**: Engine, material, special equipment, fuel item management and enhancement system
- **🌌 Planet Exploration**: Moon, Mars, Titan, Europa, Saturn planet exploration and NFT minting
- **🎯 Quest System**: DeFi-linked quest management for animal growth and spaceship enhancement
- **⚡ Fee Delegation**: **Gas fee delegation service using Kaia SDK**
- **💰 DeFi Integration**: Game resource acquisition through staking, LP providing, and lending
- **🛍️ NFT Marketplace**: Spaceship parts and exploration record NFT trading API
- **👥 Social Features**: Leaderboard, exploration record sharing, friend system
- **🔐 JWT Authentication**: LINE LIFF-based user authentication and session management

## 🚀 Quick Start

### Installation & Setup

```bash
# Install dependencies
pnpm install

# Start development server (hot reload)
pnpm run start:dev

# Run in debug mode
pnpm run start:debug

# Production build
pnpm run build

# Start production server
pnpm run start:prod

# Lint and format
pnpm run lint
pnpm run format
```

### Environment Variables

```bash
cp .env.example .env
```

### Database Setup

```bash
# Run TypeORM migrations
pnpm run typeorm migration:run

# Add seed data
pnpm run script:seed
```

## 🏗️ Architecture

### Technology Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL + TypeORM
- **Authentication**: JWT + LINE LIFF
- **Blockchain**: Kaia Chain + ethers.js + @kaiachain/ethers-ext
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest + Supertest

### Module Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── auth/                      # Authentication module
│   ├── auth.controller.ts     # LINE login, JWT management
│   ├── auth.service.ts        # Authentication logic
│   └── guards/                # Authentication guards
├── blockchain/                # 🌟 Blockchain module (Fee Delegation)
│   ├── gas-delegation.controller.ts    # Fee delegation API
│   ├── gas-delegation.service.ts       # Fee delegation logic
│   ├── kaia-ethers-ext.service.ts     # Kaia SDK integration
│   ├── blockchain.service.ts          # Basic blockchain service
│   └── dto/                           # DTO definitions
├── quests/                    # Quest module
│   ├── quests.controller.ts   # Quest CRUD API
│   ├── quests.service.ts      # Quest business logic
│   └── controllers/
│       └── defi-quest.controller.ts   # DeFi quest specialized API
├── users/                     # User module
├── friends/                   # Friend system
├── inventory/                 # Inventory management
├── marketplace/               # NFT marketplace
├── entities/                  # TypeORM entities
└── config/                    # Configuration management
```

## ⚡ Fee Delegation Implementation Details

Fee Delegation is a core feature of this project, enabling users to perform DeFi transactions on the Kaia blockchain without gas fees.

### Fee Delegation Architecture

#### Core Service Components

1. **GasDelegationService** (`gas-delegation.service.ts`): Fee delegation core logic
2. **KaiaEthersExtService** (`kaia-ethers-ext.service.ts`): Kaia SDK integration
3. **GasDelegationController** (`gas-delegation.controller.ts`): REST API endpoints

#### Supported Transaction Types

- **contract_execution**: Smart contract function calls (DeFi transactions)
- **value_transfer**: Simple token transfers
- **value_transfer_memo**: Token transfers with memo

### Fee Delegation API Endpoints

#### 1. Execute Gas Delegation

```typescript
POST /api/v1/blockchain/gas-delegation/delegate

// Request body
{
  "from": "0x742d35Cc6634C0532925a3b8D9BFB0cBb15F4DcE",    // User address
  "to": "0x6283D8384d8F6eAF24eC44D355F31CEC0bDacE3D",      // Contract address
  "data": "0xa9059cbb000000000000000000000000...",          // Transaction data
  "gas": "100000",                                         // Gas limit
  "gasPrice": "25000000000",                               // Gas price
  "value": "0",                                           // KAIA amount to send
  "signedMessage": "0x31f8b94201851d1a94a200830186a09..."  // Kaikas signed senderTxHashRLP
}

// Response
{
  "success": true,
  "txHash": "0x1234567890abcdef...",
  "gasUsed": "85432",
  "effectiveGasPrice": "25000000000",
  "feePayer": "0xFeePayer123...",
  "transactionType": "0x31"
}
```

#### 2. Gas Cost Estimation

```typescript
POST /api/v1/blockchain/gas-delegation/estimate
```

#### 3. Transaction Signing Data Preparation

```typescript
POST /api/v1/blockchain/gas-delegation/prepare-signing
```

#### 4. Gas Delegation Eligibility Check

```typescript
POST /api/v1/blockchain/gas-delegation/check-eligibility
```

#### 5. Statistics & Status

```typescript
GET /api/v1/blockchain/gas-delegation/stats
GET /api/v1/blockchain/gas-delegation/fee-payer
```

### Fee Delegation Flow Implementation

#### Frontend → Backend Communication Flow

```typescript
// 1. Frontend: Prepare DeFi transaction request
const transactionData = await prepareDefiTransaction('staking', '100');

// Backend prepareDefiQuestTransaction process:
// 1) Prepare smart contract interaction data
// 2) Estimate gas usage with kaia_estimateGas RPC
// 3) Set gas price
// 4) Return transaction data

// Backend kaia_estimateGas RPC call example:
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

// 2. Frontend: Sign transaction with Kaia SDK
const { TxType, KlaytnTxFactory } = await import('@kaiachain/ethers-ext/v6');
const tx = {
  type: TxType.FeeDelegatedSmartContractExecution,
  from: userAddress,
  to: contractAddress,
  data: transactionData.data,
  gasLimit: transactionData.gas,
  gasPrice: transactionData.gasPrice,
  nonce: await provider.getTransactionCount(userAddress),
  chainId: 1001,
};

const klaytnTx = KlaytnTxFactory.fromObject(tx);
const signedTx = await window.klaytn.request({
  method: 'klay_signTransaction', //https://docs.kaia.io/references/json-rpc/klay/sign-transaction/
  params: [tx],
});

// 3. Backend: Execute fee delegation
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
```

#### Backend Fee Delegation Core Logic (Actual Code)

```typescript
// delegateGasFees method in src/blockchain/gas-delegation.service.ts
async delegateGasFees(
  request: FeeDelegationRequest,
): Promise<FeeDelegationResponse> {
  try {
    this.logger.log(
      `KAIA gas delegation request from ${request.from} to ${request.to || 'contract deployment'}`,
    );

    // 1. Request validation
    await this.validateDelegationRequest(request);

    // 2. KAIA SDK senderTxHashRLP format processing
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
    } else {
      throw new KaiaTransactionError(
        'Either KAIA SDK senderTxHashRLP or user signature is required.',
      );
    }

    // 3. Fee payer wallet check
    const wallet = this.blockchainService.getWallet();
    if (!wallet) {
      throw new KaiaTransactionError('Fee delegation wallet not configured');
    }

    // 4. Execute fee delegation with Kaia ethers-ext service
    let txResponse;

    if (request.signedMessage && request.signedMessage.startsWith('0x31')) {
      // Use KAIA SDK senderTxHashRLP directly
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
    }

    this.logger.log(
      `KAIA fee delegated transaction sent: ${txResponse.hash}`,
    );

    // 5. Get transaction receipt
    const receipt = await this.kaiaTransactionService.getTransactionReceipt(
      txResponse.hash,
    );

    // 6. Return result
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
```

#### Kaia SDK Integration (KaiaEthersExtService) - Actual Code

```typescript
// executeFeeDelegation method in src/blockchain/kaia-ethers-ext.service.ts
async executeFeeDelegation(
  transactionRequest: {
    from: string;
    to: string;
    value: string;
    data?: string;
    gas: string;
    gasPrice?: string;
  },
  userSignedTxHashRLP: string,
): Promise<KaiaTransactionResponse> {
  try {
    this.logger.log('Executing KAIA fee delegation with ethers-ext');
    this.logger.debug('Transaction request:', transactionRequest);
    this.logger.debug(
      `User signed senderTxHashRLP: ${userSignedTxHashRLP.substring(0, 50)}...`,
    );

    // Validate senderTxHashRLP format
    if (!userSignedTxHashRLP.startsWith('0x31')) {
      throw new Error(
        `Invalid senderTxHashRLP format. Expected 0x31, got: ${userSignedTxHashRLP.substring(0, 10)}...`,
      );
    }

    // Use KAIA SDK's sendTransactionAsFeePayer method
    const sentTx = await this.feePayerWallet.sendTransactionAsFeePayer(
      userSignedTxHashRLP,
    );

    this.logger.log(`Fee delegated transaction sent: ${sentTx.hash}`);

    // Wait for transaction receipt
    const receipt = await sentTx.wait();
    this.logger.log(
      `Transaction confirmed in block ${receipt.blockNumber}`,
    );

    return {
      hash: sentTx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed?.toString() || '0',
      feePayer: this.feePayerWallet.address,
      type: '0x31', // FeeDelegatedSmartContractExecution
    };
  } catch (error) {
    this.logger.error('KAIA fee delegation failed:', error);
    throw new Error(`Fee delegation execution failed: ${error.message}`);
  }
}
```

#### Security Validation

```typescript
// Request validation logic
private async validateDelegationRequest(request: FeeDelegationRequest) {
  // Address format validation
  if (!this.blockchainService.isValidAddress(request.from)) {
    throw new BadRequestException('Invalid from address');
  }

  // Gas limit validation
  const gasLimit = BigInt(request.gas);
  if (gasLimit > this.maxGasLimit) {
    throw new BadRequestException('Gas limit exceeds maximum');
  }

  // User balance check
  const balance = await this.blockchainService.getBalance(request.from);
  if (BigInt(balance) < BigInt(request.value || 0)) {
    throw new BadRequestException('Insufficient balance');
  }
}
```

## 🎯 Quest System API

### Quest Management API

```typescript
// Get quest list
GET /api/v1/quests

// Start quest
POST /api/v1/quests/{id}/start

// Complete quest and claim rewards
POST /api/v1/quests/{id}/claim

// Get quest progress
GET /api/v1/quests/progress
```

### DeFi Quest Specialized API

```typescript
// Get DeFi portfolio
GET /api/v1/quests/defi/portfolio

// Prepare DeFi transaction (pre-fee delegation step)
POST /api/v1/quests/defi/prepare
{
  "type": "staking" | "lp_providing" | "lending",
  "amount": "100.0",
  "userAddress": "0x..."
}

// Execute DeFi transaction through fee delegation
POST /api/v1/quests/defi/execute
{
  "transactionData": { ... },
  "userSignature": "0x..."
}
```

## 🔧 Development Tools & Testing

### Code Quality

```bash
# ESLint check
pnpm run lint

# Prettier formatting
pnpm run format

# Type check
npx tsc --noEmit
```

### Testing

```bash
# Unit tests
pnpm run test

# E2E tests
pnpm run test:e2e

# Test coverage
pnpm run test:cov

# Run specific test file
pnpm run test gas-delegation.service.spec.ts
```

### API Documentation

After starting the development server, you can check the Swagger UI at these URLs:

- **Swagger UI**: http://localhost:3000/api/docs
- **OpenAPI JSON**: http://localhost:3000/api/docs-json

## 🗄️ Database Schema

### Key Entities

```typescript
// User entity
@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  lineUserId: string;

  @Column()
  username: string;

  @Column()
  email: string;

  @OneToMany(() => UserQuest, (userQuest) => userQuest.user)
  questProgress: UserQuest[];
}

// Quest entity
@Entity()
export class Quest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column({
    type: 'enum',
    enum: ['daily', 'weekly', 'special', 'legendary'],
  })
  type: QuestType;

  @Column('json')
  requirements: QuestRequirements;

  @Column('json')
  rewards: QuestRewards;
}

// UserQuest entity (quest progress)
@Entity()
export class UserQuest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Quest)
  quest: Quest;

  @Column({
    type: 'enum',
    enum: ['not_started', 'in_progress', 'completed', 'claimed'],
  })
  status: QuestStatus;

  @Column({ default: 0 })
  progress: number;

  @Column({ default: false })
  canClaim: boolean;
}
```

### Database Scripts

```bash
# Create initial quest data
pnpm run script:seed-quests

# Create dummy user data (for development)
pnpm run script:seed-dummy-users

# Seed inventory items
pnpm run script:seed-inventory

# Seed NFT data
pnpm run script:seed-nft-data
```

## 📊 Monitoring & Logging

### Logging System

```typescript
// Structured logging
this.logger.log('Gas delegation request received', {
  from: request.from,
  to: request.to,
  gas: request.gas,
  type: request.type,
});

this.logger.error('Fee delegation failed', {
  error: error.message,
  request: request,
  timestamp: new Date().toISOString(),
});
```

### Environment Configuration

```bash
# Development environment
NODE_ENV=development

# Staging environment
NODE_ENV=staging
KAIA_RPC_URL=https://public-en-kairos.node.kaia.io

# Production environment
NODE_ENV=production
KAIA_RPC_URL=https://public-en-kaia.node.kaia.io
KAIA_CHAIN_ID=8217
```

## 📚 Reference Documentation & Links

### Kaia Blockchain Official Documentation

- **[Fee Delegation Official Guide](https://docs.kaia.io/build/transactions/fee-delegation/)**: Fee delegation concepts and implementation methods on Kaia blockchain
- **[klay_signTransaction RPC](https://docs.kaia.io/references/json-rpc/klay/sign-transaction/)**: Transaction signing API reference used in Kaikas wallet
- **[kaia_estimateGas RPC](https://docs.kaia.io/references/json-rpc/kaia/estimate-gas/)**: RPC endpoint for gas cost estimation
- **[Kaia SDK ethers-ext](https://github.com/kaiachain/kaia-sdk/tree/dev/ethers-ext/src/v6)**: Kaia blockchain-specific ethers.js extension library

