import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import {
  KaiaFeeDelegatedTransaction,
  KaiaTransactionType,
  KaiaSignature,
  RLPEncodableTransaction,
  KaiaTransactionError,
} from './kaia-types';

/**
 * Service for RLP encoding/decoding KAIA transactions
 * Implements KAIA-specific RLP encoding for fee delegated transactions
 */
@Injectable()
export class KaiaRlpService {
  private readonly logger = new Logger(KaiaRlpService.name);

  /**
   * Encode transaction for signing (without signatures)
   */
  encodeTransactionForSigning(tx: KaiaFeeDelegatedTransaction): string {
    try {
      const fields = this.getTransactionFields(tx, false);
      return this.rlpEncode(fields);
    } catch (error) {
      this.logger.error('Error encoding transaction for signing:', error);
      throw new KaiaTransactionError(
        'Failed to encode transaction for signing',
        500,
        error,
      );
    }
  }

  /**
   * Encode signed transaction for broadcasting
   */
  encodeSignedTransaction(tx: RLPEncodableTransaction): string {
    try {
      const fields = this.getTransactionFields(tx, true);
      return this.rlpEncode(fields);
    } catch (error) {
      this.logger.error('Error encoding signed transaction:', error);
      throw new KaiaTransactionError(
        'Failed to encode signed transaction',
        500,
        error,
      );
    }
  }

  /**
   * Get transaction fields based on type and whether signatures are included
   */
  private getTransactionFields(
    tx: KaiaFeeDelegatedTransaction | RLPEncodableTransaction,
    withSignatures: boolean,
  ): any[] {
    switch (tx.type) {
      case KaiaTransactionType.FEE_DELEGATED_VALUE_TRANSFER:
        return this.getValueTransferFields(tx, withSignatures);

      case KaiaTransactionType.FEE_DELEGATED_VALUE_TRANSFER_MEMO:
        return this.getValueTransferMemoFields(tx, withSignatures);

      case KaiaTransactionType.FEE_DELEGATED_SMART_CONTRACT_EXECUTION:
        return this.getSmartContractExecutionFields(tx, withSignatures);

      case KaiaTransactionType.FEE_DELEGATED_SMART_CONTRACT_DEPLOY:
        return this.getSmartContractDeployFields(tx, withSignatures);

      case KaiaTransactionType.FEE_DELEGATED_VALUE_TRANSFER_WITH_RATIO:
        return this.getValueTransferWithRatioFields(tx, withSignatures);

      default:
        throw new KaiaTransactionError(
          `Unsupported transaction type: ${tx.type}`,
        );
    }
  }

  /**
   * Get fields for fee delegated value transfer
   */
  private getValueTransferFields(tx: any, withSignatures: boolean): any[] {
    const fields = [
      tx.type,
      this.toHex(tx.nonce),
      this.toHex(tx.gasPrice),
      this.toHex(tx.gas),
      tx.to.toLowerCase(),
      this.toHex(tx.value),
      tx.from.toLowerCase(),
    ];

    if (withSignatures && tx.signatures) {
      fields.push(this.encodeSignatures(tx.signatures));
      if (tx.feePayer) {
        fields.push(tx.feePayer.toLowerCase());
        if (tx.feePayerSignatures) {
          fields.push(this.encodeSignatures(tx.feePayerSignatures));
        }
      }
    }

    return fields;
  }

  /**
   * Get fields for fee delegated value transfer with memo
   */
  private getValueTransferMemoFields(tx: any, withSignatures: boolean): any[] {
    const fields = [
      tx.type,
      this.toHex(tx.nonce),
      this.toHex(tx.gasPrice),
      this.toHex(tx.gas),
      tx.to.toLowerCase(),
      this.toHex(tx.value),
      tx.from.toLowerCase(),
      tx.input || '0x',
    ];

    if (withSignatures && tx.signatures) {
      fields.push(this.encodeSignatures(tx.signatures));
      if (tx.feePayer) {
        fields.push(tx.feePayer.toLowerCase());
        if (tx.feePayerSignatures) {
          fields.push(this.encodeSignatures(tx.feePayerSignatures));
        }
      }
    }

    return fields;
  }

  /**
   * Get fields for fee delegated smart contract execution
   */
  private getSmartContractExecutionFields(
    tx: any,
    withSignatures: boolean,
  ): any[] {
    const fields = [
      tx.type,
      this.toHex(tx.nonce),
      this.toHex(tx.gasPrice),
      this.toHex(tx.gas),
      tx.to.toLowerCase(),
      this.toHex(tx.value),
      tx.from.toLowerCase(),
      tx.input || '0x',
    ];

    if (withSignatures && tx.signatures) {
      fields.push(this.encodeSignatures(tx.signatures));
      if (tx.feePayer) {
        fields.push(tx.feePayer.toLowerCase());
        if (tx.feePayerSignatures) {
          fields.push(this.encodeSignatures(tx.feePayerSignatures));
        }
      }
    }

    return fields;
  }

  /**
   * Get fields for fee delegated smart contract deploy
   */
  private getSmartContractDeployFields(
    tx: any,
    withSignatures: boolean,
  ): any[] {
    const fields = [
      tx.type,
      this.toHex(tx.nonce),
      this.toHex(tx.gasPrice),
      this.toHex(tx.gas),
      '0x',
      this.toHex(tx.value),
      tx.from.toLowerCase(),
      tx.input || '0x',
      tx.humanReadable || false,
      this.toHex(tx.codeFormat || 0),
    ];

    if (withSignatures && tx.signatures) {
      fields.push(this.encodeSignatures(tx.signatures));
      if (tx.feePayer) {
        fields.push(tx.feePayer.toLowerCase());
        if (tx.feePayerSignatures) {
          fields.push(this.encodeSignatures(tx.feePayerSignatures));
        }
      }
    }

    return fields;
  }

  /**
   * Get fields for fee delegated value transfer with ratio
   */
  private getValueTransferWithRatioFields(
    tx: any,
    withSignatures: boolean,
  ): any[] {
    const fields = [
      tx.type,
      this.toHex(tx.nonce),
      this.toHex(tx.gasPrice),
      this.toHex(tx.gas),
      tx.to.toLowerCase(),
      this.toHex(tx.value),
      tx.from.toLowerCase(),
      this.toHex(tx.feeRatio || 30),
    ];

    if (withSignatures && tx.signatures) {
      fields.push(this.encodeSignatures(tx.signatures));
      if (tx.feePayer) {
        fields.push(tx.feePayer.toLowerCase());
        if (tx.feePayerSignatures) {
          fields.push(this.encodeSignatures(tx.feePayerSignatures));
        }
      }
    }

    return fields;
  }

  /**
   * Encode signatures for RLP
   */
  private encodeSignatures(signatures: KaiaSignature[]): any[] {
    return signatures.map((sig) => [
      this.toHex(sig.V),
      this.toHex(sig.R),
      this.toHex(sig.S),
    ]);
  }

  /**
   * Convert value to hex string
   */
  private toHex(value: string | number | bigint | boolean): string {
    if (typeof value === 'boolean') {
      return value ? '0x01' : '0x00';
    }

    if (typeof value === 'string') {
      if (value.startsWith('0x')) {
        return value;
      }
      // Try to parse as number
      const num = BigInt(value);
      return '0x' + num.toString(16);
    }

    if (typeof value === 'number') {
      return '0x' + value.toString(16);
    }

    if (typeof value === 'bigint') {
      return '0x' + value.toString(16);
    }

    return '0x0';
  }

  /**
   * RLP encode using ethers utility
   */
  private rlpEncode(data: any[]): string {
    // Use ethers RLP encoding
    return ethers.encodeRlp(data);
  }

  /**
   * Create signature from v, r, s values
   */
  createSignature(v: string, r: string, s: string): KaiaSignature {
    return {
      V: this.toHex(v),
      R: this.toHex(r),
      S: this.toHex(s),
    };
  }

  /**
   * Parse signature from ethers signature
   */
  parseSignature(signature: string): KaiaSignature {
    const sig = ethers.Signature.from(signature);
    return {
      V: this.toHex(sig.v),
      R: this.toHex(sig.r),
      S: this.toHex(sig.s),
    };
  }

  /**
   * Convert signature to compact format
   */
  signatureToCompact(signature: KaiaSignature): string {
    const v = signature.V.startsWith('0x') ? signature.V.slice(2) : signature.V;
    const r = signature.R.startsWith('0x') ? signature.R.slice(2) : signature.R;
    const s = signature.S.startsWith('0x') ? signature.S.slice(2) : signature.S;

    return (
      '0x' + r.padStart(64, '0') + s.padStart(64, '0') + v.padStart(2, '0')
    );
  }
}
