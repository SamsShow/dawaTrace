import { describe, it, expect, vi, beforeEach } from 'vitest';
import { verifyResolvers } from '../../graphql/resolvers/verify.js';

vi.mock('../../sui/queries.js', () => ({
  verifyBatch: vi.fn(),
}));

import * as suiQueries from '../../sui/queries.js';

const mockSuiQueries = vi.mocked(suiQueries);

const MOCK_VERIFICATION = {
  batchId: 'BATCH-2026-001',
  isValid: true,
  recalled: false,
  fabricDataHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  expiryDate: '2027-06-30',
  custodyChain: [
    {
      objectId: 'tx-digest-001',
      batchId: 'BATCH-2026-001',
      fromNode: 'SUN-PHARMA-MFG-001',
      toNode: 'DIST-DELHI-002',
      quantity: 10000,
      fabricDataHash: '',
      sequence: 1,
      timestamp: Date.now() - 5 * 86400000,
    },
  ],
  suiObjectId: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123',
};

describe('verify resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query.verifyBatch', () => {
    it('should call suiQueries.verifyBatch with the suiObjectId', async () => {
      mockSuiQueries.verifyBatch.mockResolvedValue(MOCK_VERIFICATION);

      const suiObjectId = '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123';
      const result = await verifyResolvers.Query.verifyBatch(undefined, { suiObjectId });

      expect(mockSuiQueries.verifyBatch).toHaveBeenCalledWith(suiObjectId);
      expect(result.batchId).toBe('BATCH-2026-001');
      expect(result.isValid).toBe(true);
      expect(result.recalled).toBe(false);
      expect(result.custodyChain).toHaveLength(1);
    });

    it('should return recalled batch as invalid', async () => {
      const recalledResult = {
        ...MOCK_VERIFICATION,
        batchId: 'BATCH-2026-003',
        isValid: false,
        recalled: true,
      };
      mockSuiQueries.verifyBatch.mockResolvedValue(recalledResult);

      const result = await verifyResolvers.Query.verifyBatch(undefined, {
        suiObjectId: '0x111222333444555666777888999aaabbbccc111222333444555666777888999aaa',
      });

      expect(result.isValid).toBe(false);
      expect(result.recalled).toBe(true);
    });

    it('should propagate errors when Sui object not found', async () => {
      mockSuiQueries.verifyBatch.mockRejectedValue(
        new Error('Sui object 0xdeadbeef not found or not a Move object'),
      );

      await expect(
        verifyResolvers.Query.verifyBatch(undefined, { suiObjectId: '0xdeadbeef' }),
      ).rejects.toThrow('Sui object 0xdeadbeef not found');
    });
  });
});
