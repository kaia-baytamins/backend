/**
 * KAIA blockchain specific types and constants for fee delegation
 */

// KAIA transaction types for fee delegation
export enum KaiaTransactionType {
  // Legacy transaction types
  LEGACY = '0x00',
  VALUE_TRANSFER = '0x08',
  VALUE_TRANSFER_MEMO = '0x10',
  SMART_CONTRACT_DEPLOY = '0x28',
  SMART_CONTRACT_EXECUTION = '0x30',
  ACCOUNT_UPDATE = '0x20',
  CANCEL = '0x38',
  CHAIN_DATA_ANCHORING = '0x48',

  // Fee delegated transaction types
  FEE_DELEGATED_VALUE_TRANSFER = '0x09',
  FEE_DELEGATED_VALUE_TRANSFER_MEMO = '0x11',
  FEE_DELEGATED_SMART_CONTRACT_DEPLOY = '0x29',
  FEE_DELEGATED_SMART_CONTRACT_EXECUTION = '0x31',
  FEE_DELEGATED_ACCOUNT_UPDATE = '0x21',
  FEE_DELEGATED_CANCEL = '0x39',
  FEE_DELEGATED_CHAIN_DATA_ANCHORING = '0x49',

  // Fee delegated with ratio
  FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO = '0x0a',
  FEE_DELEGATED_VALUE_TRANSFER_MEMO_WITH_RATIO = '0x12',
  FEE_DELEGATED_SMART_CONTRACT_DEPLOY_WITH_RATIO = '0x2a',
  FEE_DELEGATED_SMART_CONTRACT_EXECUTION_WITH_RATIO = '0x32',
  FEE_DELEGATED_ACCOUNT_UPDATE_WITH_RATIO = '0x22',
  FEE_DELEGATED_CANCEL_WITH_RATIO = '0x3a',
  FEE_DELEGATED_CHAIN_DATA_ANCHORING_WITH_RATIO = '0x4a',
}

// KAIA transaction interfaces
export interface KaiaTransactionBase {
  type: KaiaTransactionType;
  nonce: string;
  gasPrice: string;
  gas: string;
  from: string;
  signatures?: KaiaSignature[];
}

export interface KaiaFeeDelegatedTransactionBase extends KaiaTransactionBase {
  feePayer?: string;
  feePayerSignatures?: KaiaSignature[];
  feeRatio?: number; // 0-99 for ratio-based fee delegation
}

export interface KaiaValueTransfer extends KaiaFeeDelegatedTransactionBase {
  type: KaiaTransactionType.FEE_DELEGATED_VALUE_TRANSFER;
  to: string;
  value: string;
}

export interface KaiaValueTransferMemo extends KaiaFeeDelegatedTransactionBase {
  type: KaiaTransactionType.FEE_DELEGATED_VALUE_TRANSFER_MEMO;
  to: string;
  value: string;
  input: string; // memo data
}

export interface KaiaSmartContractExecution
  extends KaiaFeeDelegatedTransactionBase {
  type: KaiaTransactionType.FEE_DELEGATED_SMART_CONTRACT_EXECUTION;
  to: string;
  value: string;
  input: string; // contract call data
}

export interface KaiaSmartContractDeploy
  extends KaiaFeeDelegatedTransactionBase {
  type: KaiaTransactionType.FEE_DELEGATED_SMART_CONTRACT_DEPLOY;
  value: string;
  input: string; // contract bytecode
  humanReadable: boolean;
  codeFormat: number;
}

// Union type for all fee delegated transactions
export type KaiaFeeDelegatedTransaction =
  | KaiaValueTransfer
  | KaiaValueTransferMemo
  | KaiaSmartContractExecution
  | KaiaSmartContractDeploy;

// RPC method names for KAIA
export const KAIA_RPC_METHODS = {
  SEND_TRANSACTION: 'klay_sendTransaction',
  SEND_RAW_TRANSACTION: 'klay_sendRawTransaction',
  ESTIMATE_GAS: 'klay_estimateGas',
  GET_TRANSACTION: 'klay_getTransactionByHash',
  GET_TRANSACTION_RECEIPT: 'klay_getTransactionReceipt',
  CALL: 'klay_call',
  GET_BALANCE: 'klay_getBalance',
  GET_BLOCK_NUMBER: 'klay_blockNumber',
  GET_GAS_PRICE: 'klay_gasPrice',
  ACCOUNT_CREATED: 'klay_accountCreated',
  ENCODE_ACCOUNT_KEY: 'klay_encodeAccountKey',
} as const;

// KAIA signature structure
export interface KaiaSignature {
  V: string;
  R: string;
  S: string;
}

// Helper type for RLP encoding
export interface RLPEncodableTransaction {
  type: string;
  nonce: string;
  gasPrice: string;
  gas: string;
  to?: string;
  value: string;
  from: string;
  input?: string;
  signatures: KaiaSignature[];
  feePayer?: string;
  feePayerSignatures?: KaiaSignature[];
  feeRatio?: number;
  humanReadable?: boolean;
  codeFormat?: number;
}

// Response types from KAIA RPC
export interface KaiaTransactionResponse {
  blockHash: string;
  blockNumber: string;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  nonce: string;
  to: string;
  transactionIndex: string;
  value: string;
  type: string;
  typeInt: number;
  signatures: KaiaSignature[];
  feePayer?: string;
  feePayerSignatures?: KaiaSignature[];
  feeRatio?: number;
}

export interface KaiaTransactionReceipt {
  blockHash: string;
  blockNumber: string;
  contractAddress: string | null;
  from: string;
  gas: string;
  gasPrice: string;
  gasUsed: string;
  logs: any[];
  logsBloom: string;
  nonce: string;
  senderTxHash: string;
  status: string;
  to: string;
  transactionHash: string;
  transactionIndex: string;
  type: string;
  typeInt: number;
  value: string;
  feePayer?: string;
  feePayerSignatures?: KaiaSignature[];
  feeRatio?: number;
}

// Error types
export class KaiaTransactionError extends Error {
  constructor(
    message: string,
    public code?: number,
    public data?: any,
  ) {
    super(message);
    this.name = 'KaiaTransactionError';
  }
}
