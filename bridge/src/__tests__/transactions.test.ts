import { describe, it, expect, vi } from 'vitest';

vi.mock('../config.js', () => ({
  config: {
    BRIDGE_PACKAGE_ID: '0xTEST_PACKAGE_ID',
  },
}));

import {
  buildMintBatchTx,
  buildMarkRecalledTx,
  buildAnchorHashTx,
  buildRecordTransferTx,
  buildAwardPointsTx,
} from '../sui/transactions.js';
import { Transaction } from '@mysten/sui/transactions';

describe('Sui transaction builders', () => {
  describe('buildMintBatchTx', () => {
    it('should create a valid Transaction', () => {
      const tx = buildMintBatchTx({
        batchId: 'BATCH-2026-001',
        manufacturer: 'SUN-PHARMA-MFG-001',
        drugName: 'Amoxicillin 500mg',
        composition: 'Amoxicillin trihydrate 574mg eq. to Amoxicillin 500mg',
        expiryDate: '2027-06-30',
        quantity: 10000,
        fabricDataHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
        manufacturerAddress: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        capabilityId: '0xcap0001',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });

    it('should accept different batch parameters', () => {
      const tx = buildMintBatchTx({
        batchId: 'BATCH-2026-099',
        manufacturer: 'CIPLA-MFG-001',
        drugName: 'Paracetamol 650mg',
        composition: 'Paracetamol IP 650mg',
        expiryDate: '2027-12-31',
        quantity: 25000,
        fabricDataHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
        manufacturerAddress: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        capabilityId: '0xcap0002',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });
  });

  describe('buildMarkRecalledTx', () => {
    it('should create a valid Transaction', () => {
      const tx = buildMarkRecalledTx({
        batchObjectId: '0xbatch_object_001',
        capabilityId: '0xcap0001',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });

    it('should work with different object IDs', () => {
      const tx = buildMarkRecalledTx({
        batchObjectId: '0xbatch_object_999',
        capabilityId: '0xcap_different',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });
  });

  describe('buildAnchorHashTx', () => {
    it('should create a valid Transaction', () => {
      const tx = buildAnchorHashTx({
        batchObjectId: '0xbatch_object_001',
        newHash: 'deadbeefcafebabe1234567890abcdef',
        capabilityId: '0xcap0001',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });

    it('should handle different hash values', () => {
      const tx = buildAnchorHashTx({
        batchObjectId: '0xbatch_object_002',
        newHash: '0000111122223333444455556666777788889999aaaabbbbccccddddeeee',
        capabilityId: '0xcap0001',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });
  });

  describe('buildRecordTransferTx', () => {
    it('should create a valid Transaction', () => {
      const tx = buildRecordTransferTx({
        batchId: 'BATCH-2026-001',
        fromNode: 'SUN-PHARMA-MFG-001',
        toNode: 'DIST-DELHI-002',
        quantity: 10000,
        fabricDataHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
        sequence: 1,
        capabilityId: '0xcap0001',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });

    it('should handle sequential transfers with incrementing sequence', () => {
      const tx1 = buildRecordTransferTx({
        batchId: 'BATCH-2026-001',
        fromNode: 'MFG-001',
        toNode: 'DIST-001',
        quantity: 5000,
        fabricDataHash: 'aabbccdd',
        sequence: 1,
        capabilityId: '0xcap0001',
      });

      const tx2 = buildRecordTransferTx({
        batchId: 'BATCH-2026-001',
        fromNode: 'DIST-001',
        toNode: 'CHEM-001',
        quantity: 500,
        fabricDataHash: 'eeff0011',
        sequence: 2,
        capabilityId: '0xcap0001',
      });

      expect(tx1).toBeInstanceOf(Transaction);
      expect(tx2).toBeInstanceOf(Transaction);
    });
  });

  describe('buildAwardPointsTx', () => {
    it('should create a valid Transaction', () => {
      const tx = buildAwardPointsTx({
        reporter: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        batchId: 'BATCH-2026-003',
        amount: 100,
        capabilityId: '0xcap0001',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });

    it('should handle different point amounts', () => {
      const tx = buildAwardPointsTx({
        reporter: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
        batchId: 'BATCH-2026-001',
        amount: 500,
        capabilityId: '0xcap0001',
      });

      expect(tx).toBeInstanceOf(Transaction);
    });
  });
});
