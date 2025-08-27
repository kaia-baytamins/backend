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
   * KAIA format: transaction_type + RLP(transaction_fields + chainId)
   */
  encodeTransactionForSigning(
    tx: KaiaFeeDelegatedTransaction,
    chainId: number = 1001,
  ): string {
    try {
      this.logger.debug('Encoding transaction for signing:', {
        type: tx.type,
        from: tx.from,
        to: (tx as any).to,
        value: (tx as any).value,
        gas: tx.gas,
        gasPrice: tx.gasPrice,
        nonce: tx.nonce,
        input: (tx as any).input,
        chainId,
      });

      const fields = this.getTransactionFields(tx, false);

      this.logger.debug('Transaction fields for signing:', fields);

      // KAIA double encoding: encode([encode([type, nonce, gasPrice, gas, to, value, from, input]), chainid, 0, 0])
      const txFields = [tx.type.slice(2), ...fields]; // Remove 0x from type
      const firstEncoded = this.rlpEncode(txFields);
      this.logger.debug('First RLP encoding (tx fields):', firstEncoded);

      // Second encoding with chainId, 0, 0
      const secondFields = [firstEncoded, this.toHex(chainId), '0x', '0x'];
      const rlpEncoded = this.rlpEncode(secondFields);
      this.logger.debug('Second RLP encoding with chainId:', rlpEncoded);

      // KAIA format: prepend transaction type to double-encoded RLP
      const fullEncoded = tx.type + rlpEncoded.slice(2); // Remove 0x from RLP and prepend type
      this.logger.debug(
        'Full KAIA encoded transaction for signing:',
        fullEncoded,
      );

      return fullEncoded;
    } catch (error) {
      this.logger.error('Error encoding transaction for signing:', {
        error: error.message,
        stack: error.stack,
        transaction: tx,
      });
      throw new KaiaTransactionError(
        `Failed to encode transaction for signing: ${error.message}`,
        500,
        error,
      );
    }
  }

  /**
   * Encode signed transaction for broadcasting
   * KAIA format: transaction_type + RLP(transaction_fields_with_signatures)
   */
  encodeSignedTransaction(tx: RLPEncodableTransaction): string {
    try {
      this.logger.debug('Encoding signed transaction:', {
        type: tx.type,
        from: tx.from,
        to: tx.to,
        hasSignatures: !!tx.signatures,
        hasFeePayer: !!tx.feePayer,
        hasFeePayerSignatures: !!tx.feePayerSignatures,
      });

      const fields = this.getTransactionFields(tx, true);
      this.logger.debug(
        'Signed transaction fields:',
        JSON.stringify(fields, null, 2),
      );

      const rlpEncoded = this.rlpEncode(fields);
      this.logger.debug('RLP encoded signed fields:', rlpEncoded);

      // KAIA format: prepend transaction type to RLP-encoded fields
      const fullEncoded = tx.type + rlpEncoded.slice(2); // Remove 0x from RLP and prepend type
      this.logger.debug('Full KAIA encoded signed transaction:', fullEncoded);

      return fullEncoded;
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
   * Fields: nonce, gasPrice, gas, to, value, from, [signatures, feePayer, feePayerSignatures]
   */
  private getValueTransferFields(tx: any, withSignatures: boolean): any[] {
    const fields = [
      this.toHex(tx.nonce),
      this.toHex(tx.gasPrice),
      this.toHex(tx.gas),
      tx.to.toLowerCase(), // Must be a valid address
      this.toHex(tx.value || '0'),
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
   * Fields: nonce, gasPrice, gas, to, value, from, input, [signatures, feePayer, feePayerSignatures]
   */
  private getValueTransferMemoFields(tx: any, withSignatures: boolean): any[] {
    const fields = [
      this.toHex(tx.nonce),
      this.toHex(tx.gasPrice),
      this.toHex(tx.gas),
      tx.to.toLowerCase(), // Must be a valid address
      this.toHex(tx.value || '0'),
      tx.from.toLowerCase(),
      tx.input ? tx.input : '0x',
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
   * Fields: nonce, gasPrice, gas, to, value, from, input, [signatures, feePayer, feePayerSignatures]
   */
  private getSmartContractExecutionFields(
    tx: any,
    withSignatures: boolean,
  ): any[] {
    const fields = [
      this.toHex(tx.nonce),
      this.toHex(tx.gasPrice),
      this.toHex(tx.gas),
      tx.to.toLowerCase(), // Must be a valid contract address
      this.toHex(tx.value || '0'),
      tx.from.toLowerCase(),
      tx.input ? tx.input : '0x',
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
   * Convert value to hex string (RLP canonical - no leading zeros)
   */
  private toHex(value: string | number | bigint | boolean): string {
    try {
      if (value === undefined || value === null) {
        return '0x0';
      }

      if (typeof value === 'boolean') {
        return value ? '0x1' : '0x0';
      }

      if (typeof value === 'string') {
        if (value.startsWith('0x')) {
          // Already a hex string, remove leading zeros for RLP canonical format
          if (value === '0x' || value === '0x0' || value === '0x00') {
            return '0x0';
          }
          // Remove leading zeros but keep at least one digit
          const cleaned = value.replace(/^0x0+/, '0x');
          return cleaned === '0x' ? '0x0' : cleaned;
        }
        if (value === '' || value === '0') {
          return '0x0';
        }
        // Try to parse as number
        try {
          const num = BigInt(value);
          if (num === 0n) {
            return '0x0';
          }
          const hex = num.toString(16);
          return '0x' + hex;
        } catch (error) {
          // If BigInt parsing fails, return as is (might be an address or other string)
          return value;
        }
      }

      if (typeof value === 'number') {
        if (value === 0) {
          return '0x0';
        }
        const hex = value.toString(16);
        return '0x' + hex;
      }

      if (typeof value === 'bigint') {
        if (value === 0n) {
          return '0x0';
        }
        const hex = value.toString(16);
        return '0x' + hex;
      }

      return '0x';
    } catch (error) {
      this.logger.error('Error converting value to hex:', {
        value,
        error: error.message,
      });
      throw new KaiaTransactionError(
        `Failed to convert value to hex: ${value}`,
      );
    }
  }

  /**
   * RLP encode using ethers utility
   */
  private rlpEncode(data: any[]): string {
    try {
      this.logger.debug('RLP encoding data:', JSON.stringify(data, null, 2));

      // Ensure all values are proper hex strings or bytes
      const processedData = this.processRlpData(data);
      this.logger.debug(
        'Processed RLP data:',
        JSON.stringify(processedData, null, 2),
      );

      const encoded = ethers.encodeRlp(processedData);
      this.logger.debug('Final RLP encoded result:', encoded);

      // Decode and log for debugging
      try {
        const decoded = ethers.decodeRlp(encoded);
        this.logger.debug(
          'RLP decoded verification:',
          JSON.stringify(decoded, null, 2),
        );
      } catch (decodeError) {
        this.logger.error(
          'RLP decode verification failed:',
          decodeError.message,
        );
      }

      return encoded;
    } catch (error) {
      this.logger.error('RLP encoding failed:', {
        error: error.message,
        data: JSON.stringify(data, null, 2),
      });
      throw new KaiaTransactionError(`RLP encoding failed: ${error.message}`);
    }
  }

  /**
   * Process RLP data to ensure proper format for ethers.encodeRlp
   * RLP requires canonical integer encoding (no leading zeros)
   */
  private processRlpData(data: any): any {
    if (Array.isArray(data)) {
      return data.map((item) => this.processRlpData(item));
    }

    if (typeof data === 'string') {
      // Handle hex strings
      if (data.startsWith('0x')) {
        // Check if this looks like an address (20 bytes = 40 hex chars + 0x)
        if (data.length === 42 && /^0x[0-9a-fA-F]{40}$/.test(data)) {
          // This is an address - return as-is (addresses should not have leading zeros removed)
          return data.toLowerCase();
        }

        // Validate hex string
        if (!/^0x[0-9a-fA-F]*$/.test(data)) {
          this.logger.warn(`Invalid hex string: ${data}, converting to 0x`);
          return '0x';
        }

        // For RLP canonical format - remove leading zeros for numeric values
        if (data === '0x' || data === '0x0') {
          return '0x';
        }

        // Remove leading zeros: 0x000123 -> 0x123, 0x0000 -> 0x
        const withoutLeadingZeros = data.replace(/^0x0+/, '0x');

        // If result is just '0x', this means all digits were zero
        if (withoutLeadingZeros === '0x') {
          return '0x';
        }

        // If we now have an odd number of hex digits, pad with one zero
        // 0x123 -> 0x0123 (for proper byte alignment)
        const hexDigits = withoutLeadingZeros.slice(2);
        if (hexDigits.length % 2 === 1) {
          return '0x0' + hexDigits;
        }

        return withoutLeadingZeros;
      }
      // Convert non-hex strings to canonical hex
      return this.toHex(data);
    }

    if (typeof data === 'number' || typeof data === 'bigint') {
      return this.toHex(data);
    }

    if (typeof data === 'boolean') {
      return data ? '0x1' : '0x';
    }

    // For other types, convert to string and then hex
    return this.toHex(String(data));
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

  /**
   * Parse signature using KAIA's actual V value format
   * Based on KAIA official example showing V values around 32-40 range
   */
  parseSignature(signature: string): KaiaSignature {
    try {
      // Manual parsing to preserve signature components
      const r = signature.slice(0, 66); // 0x + 64 hex chars
      const s = '0x' + signature.slice(66, 130); // 64 hex chars
      const vHex = '0x' + signature.slice(130); // remaining chars
      const originalV = parseInt(vHex, 16);

      this.logger.debug('Parsing user signature with KAIA format:', {
        signature,
        r,
        s,
        vHex,
        originalV,
      });

      // KAIA uses dynamic V values based on actual signature recovery
      // From multiple KAIA test runs, we see V values change dynamically
      // Instead of hardcoding, let's try to calculate the correct V value
      const recoveryParam = originalV % 2; // 0 or 1

      // Based on KAIA examples, try different V calculation methods
      const candidateVValues = [
        27 + recoveryParam, // Standard: 27, 28
        31 + recoveryParam, // KAIA range 1: 31, 32
        35 + recoveryParam, // KAIA range 2: 35, 36
        originalV, // Use original V as-is
        originalV - 27 + 27, // Normalize and rebuild
        originalV % 256, // Last byte only
      ];

      // Use the third candidate: KAIA range 2 (35+recovery)
      const kaiaV = candidateVValues[6]; // Try KAIA range 2: 35, 36
      const kaiaVHex = `0x${kaiaV.toString(16)}`;

      this.logger.debug('Dynamic KAIA V calculation:', {
        originalV,
        originalVHex: `0x${originalV.toString(16)}`,
        recoveryParam,
        candidateVValues: candidateVValues.map((v) => `0x${v.toString(16)}`),
        selectedKaiaV: kaiaV,
        kaiaVHex,
      });

      return {
        V: kaiaVHex, // Use KAIA V value from official example
        R: r,
        S: s,
      };
    } catch (error) {
      this.logger.error('Error parsing signature:', error);
      throw new KaiaTransactionError('Invalid signature format');
    }
  }
}
