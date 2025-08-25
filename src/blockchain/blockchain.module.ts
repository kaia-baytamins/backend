import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BlockchainService } from './blockchain.service';
import { GasDelegationService } from './gas-delegation.service';
import { GasDelegationController } from './gas-delegation.controller';
import { KaiaTransactionService } from './kaia-transaction.service';
import { KaiaRlpService } from './kaia-rlp.service';
import { ContractService } from './contract.service';
import { DefiService } from './defi.service';

@Module({
  imports: [ConfigModule],
  controllers: [GasDelegationController],
  providers: [
    BlockchainService,
    KaiaRlpService,
    KaiaTransactionService,
    GasDelegationService,
    ContractService,
    DefiService,
  ],
  exports: [
    BlockchainService,
    KaiaRlpService,
    KaiaTransactionService,
    GasDelegationService,
    ContractService,
    DefiService,
  ],
})
export class BlockchainModule {}
