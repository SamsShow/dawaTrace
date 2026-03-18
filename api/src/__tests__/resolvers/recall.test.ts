import { describe, it, expect, vi, beforeEach } from 'vitest';
import { recallResolvers } from '../../graphql/resolvers/recall.js';

vi.mock('../../fabric/client.js', () => ({
  listRecalls: vi.fn(),
  issueRecall: vi.fn(),
}));

vi.mock('../../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import * as fabricClient from '../../fabric/client.js';

const mockFabricClient = vi.mocked(fabricClient);

const MOCK_RECALLS = [
  {
    batchId: 'BATCH-2026-003',
    regulatorId: 'CDSCO-REG-001',
    reason: 'Substandard dissolution profile detected in QC sampling — lot ZY-MET-26003 fails BP 2023 spec.',
    timestamp: Date.now() - 3600000,
    suiTxDigest: 'Gx9mK2pLvW4nQrTsYuZaXbCdEfHiJkMoNpRsTuVwXyZ1234567890abcdef',
  },
];

describe('recall resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query.recalls', () => {
    it('should return list of recalls', async () => {
      mockFabricClient.listRecalls.mockResolvedValue(MOCK_RECALLS);

      const result = await recallResolvers.Query.recalls();

      expect(mockFabricClient.listRecalls).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].batchId).toBe('BATCH-2026-003');
      expect(result[0].regulatorId).toBe('CDSCO-REG-001');
    });

    it('should return empty array when no recalls exist', async () => {
      mockFabricClient.listRecalls.mockResolvedValue([]);

      const result = await recallResolvers.Query.recalls();

      expect(result).toEqual([]);
    });
  });

  describe('Mutation.issueRecall', () => {
    it('should call fabricClient.issueRecall with correct params', async () => {
      mockFabricClient.issueRecall.mockResolvedValue(undefined);

      const args = {
        batchId: 'BATCH-2026-003',
        reason: 'Failed quality control test',
      };

      const ctx = {
        user: { nodeId: 'CDSCO-REG-001', orgRole: 'REGULATOR' as const, mspId: 'RegMSP' },
      };

      const result = await recallResolvers.Mutation.issueRecall(undefined, args, ctx);

      expect(mockFabricClient.issueRecall).toHaveBeenCalledWith({
        batchId: 'BATCH-2026-003',
        regulatorId: 'CDSCO-REG-001',
        reason: 'Failed quality control test',
      });
      expect(result).toEqual({
        success: true,
        message: 'Recall issued for batch BATCH-2026-003',
      });
    });

    it('should propagate errors from fabricClient', async () => {
      mockFabricClient.issueRecall.mockRejectedValue(new Error('Fabric network unavailable'));

      const args = { batchId: 'BATCH-2026-003', reason: 'QC failure' };
      const ctx = {
        user: { nodeId: 'CDSCO-REG-001', orgRole: 'REGULATOR' as const, mspId: 'RegMSP' },
      };

      await expect(
        recallResolvers.Mutation.issueRecall(undefined, args, ctx),
      ).rejects.toThrow('Fabric network unavailable');
    });
  });
});
