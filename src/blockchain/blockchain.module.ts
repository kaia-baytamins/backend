import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BlockchainService } from './blockchain.service';
import { GasDelegationService } from './gas-delegation.service';
import { ContractService } from './contract.service';
import { DefiService } from './defi.service';

@Module({
  imports: [ConfigModule],
  providers: [
    BlockchainService,
    GasDelegationService,
    ContractService,
    DefiService,
  ],
  exports: [
    BlockchainService,
    GasDelegationService,
    ContractService,
    DefiService,
  ],
})
export class BlockchainModule {}
