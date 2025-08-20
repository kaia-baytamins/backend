import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { BlockchainService } from './blockchain.service';
import { GasDelegationService } from './gas-delegation.service';
import { ContractService } from './contract.service';

@Module({
  imports: [ConfigModule],
  providers: [BlockchainService, GasDelegationService, ContractService],
  exports: [BlockchainService, GasDelegationService, ContractService],
})
export class BlockchainModule {}
