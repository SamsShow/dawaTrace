import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../fabric/client.js', () => ({
  getBatch: vi.fn(),
  listBatches: vi.fn(),
  mintBatch: vi.fn(),
  transferBatch: vi.fn(),
  flagChemist: vi.fn(),
}));

vi.mock('../../sui/queries.js', () => ({
  verifyBatch: vi.fn(),
}));

vi.mock('../../anomaly/detector.js', () => ({
  detectAnomalies: vi.fn(),
}));

vi.mock('../../graphql/pubsub.js', () => ({
  pubsub: {
    publish: vi.fn(),
    asyncIterableIterator: vi.fn(),
  },
  EVENTS: {
    BATCH_EVENT: 'BATCH_EVENT',
  },
}));

import { batchResolvers } from '../../graphql/resolvers/batch.js';
import * as fabricClient from '../../fabric/client.js';
import { detectAnomalies } from '../../anomaly/detector.js';

const mockFabricClient = vi.mocked(fabricClient);
const mockDetectAnomalies = vi.mocked(detectAnomalies);

const MOCK_BATCH = {
  batchId: 'BATCH-2026-001',
  manufacturerId: 'SUN-PHARMA-MFG-001',
  drugName: 'Amoxicillin 500mg',
  composition: 'Amoxicillin trihydrate 574mg eq. to Amoxicillin 500mg',
  expiryDate: '2027-06-30',
  quantity: 10000,
  currentCustodian: 'DIST-DELHI-002',
  status: 'IN_TRANSIT' as const,
  details: { licenseNo: 'MFG-DL-2024-1182', batchRef: 'SP-AMX-26001' },
  dataHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  suiObjectId: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123',
  createdAt: Date.now() - 7 * 86400000,
  updatedAt: Date.now() - 1 * 86400000,
};

const MOCK_BATCHES = [
  MOCK_BATCH,
  {
    batchId: 'BATCH-2026-002',
    manufacturerId: 'CIPLA-MFG-001',
    drugName: 'Paracetamol 650mg',
    composition: 'Paracetamol IP 650mg',
    expiryDate: '2027-12-31',
    quantity: 25000,
    currentCustodian: 'CHEM-MUM-0091',
    status: 'ACTIVE' as const,
    details: { licenseNo: 'MFG-MH-2024-0391', batchRef: 'CI-PCT-26002' },
    dataHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    suiObjectId: '0xdef456abc123def456abc123def456abc123def456abc123def456abc123def456',
    createdAt: Date.now() - 14 * 86400000,
    updatedAt: Date.now() - 2 * 86400000,
  },
];

describe('batch resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Query.batch', () => {
    it('should return a batch by ID', async () => {
      mockFabricClient.getBatch.mockResolvedValue(MOCK_BATCH);

      const result = await batchResolvers.Query.batch(
        undefined,
        { batchId: 'BATCH-2026-001' },
      );

      expect(mockFabricClient.getBatch).toHaveBeenCalledWith('BATCH-2026-001');
      expect(result).toEqual(MOCK_BATCH);
      expect(result.batchId).toBe('BATCH-2026-001');
      expect(result.drugName).toBe('Amoxicillin 500mg');
    });
  });

  describe('Query.batches', () => {
    it('should return a list of batches', async () => {
      mockFabricClient.listBatches.mockResolvedValue(MOCK_BATCHES);

      const result = await batchResolvers.Query.batches();

      expect(mockFabricClient.listBatches).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].batchId).toBe('BATCH-2026-001');
      expect(result[1].batchId).toBe('BATCH-2026-002');
    });
  });

  describe('Query.anomalies', () => {
    it('should return an empty array when no anomalies detected', async () => {
      mockFabricClient.listBatches.mockResolvedValue(MOCK_BATCHES);
      mockDetectAnomalies.mockReturnValue([]);

      const result = await batchResolvers.Query.anomalies(undefined, {});

      expect(mockFabricClient.listBatches).toHaveBeenCalled();
      expect(mockDetectAnomalies).toHaveBeenCalledWith(MOCK_BATCHES, undefined);
      expect(result).toEqual([]);
    });

    it('should pass limit to detectAnomalies', async () => {
      mockFabricClient.listBatches.mockResolvedValue(MOCK_BATCHES);
      mockDetectAnomalies.mockReturnValue([]);

      await batchResolvers.Query.anomalies(undefined, { limit: 5 });

      expect(mockDetectAnomalies).toHaveBeenCalledWith(MOCK_BATCHES, 5);
    });
  });

  describe('Mutation.mintBatch', () => {
    it('should call fabricClient.mintBatch with correct params', async () => {
      mockFabricClient.mintBatch.mockResolvedValue(undefined);

      const args = {
        batchId: 'BATCH-2026-NEW',
        drugName: 'Ibuprofen 400mg',
        composition: 'Ibuprofen IP 400mg',
        expiryDate: '2028-01-31',
        quantity: 5000,
        details: JSON.stringify({ licenseNo: 'MFG-KA-2025-0001' }),
      };

      const ctx = {
        user: { nodeId: 'MFG-NODE-001', orgRole: 'MANUFACTURER' as const, mspId: 'SunPharmaMSP' },
      };

      const result = await batchResolvers.Mutation.mintBatch(undefined, args, ctx);

      expect(mockFabricClient.mintBatch).toHaveBeenCalledWith({
        batchId: 'BATCH-2026-NEW',
        manufacturerId: 'MFG-NODE-001',
        drugName: 'Ibuprofen 400mg',
        composition: 'Ibuprofen IP 400mg',
        expiryDate: '2028-01-31',
        quantity: 5000,
        details: { licenseNo: 'MFG-KA-2025-0001' },
      });
      expect(result).toEqual({ success: true, message: 'Batch BATCH-2026-NEW minted' });
    });

    it('should pass empty details when details arg is omitted', async () => {
      mockFabricClient.mintBatch.mockResolvedValue(undefined);

      const args = {
        batchId: 'BATCH-2026-NEW',
        drugName: 'Ibuprofen 400mg',
        composition: 'Ibuprofen IP 400mg',
        expiryDate: '2028-01-31',
        quantity: 5000,
      };

      const ctx = {
        user: { nodeId: 'MFG-NODE-001', orgRole: 'MANUFACTURER' as const, mspId: 'SunPharmaMSP' },
      };

      await batchResolvers.Mutation.mintBatch(undefined, args, ctx);

      expect(mockFabricClient.mintBatch).toHaveBeenCalledWith(
        expect.objectContaining({ details: {} }),
      );
    });
  });

  describe('Mutation.transferBatch', () => {
    it('should call fabricClient.transferBatch with correct params', async () => {
      mockFabricClient.transferBatch.mockResolvedValue(undefined);

      const args = {
        batchId: 'BATCH-2026-001',
        toNode: 'CHEM-MUM-0091',
        quantity: 500,
        gpsLocation: '19.0760,72.8777',
      };

      const ctx = {
        user: { nodeId: 'DIST-DELHI-002', orgRole: 'DISTRIBUTOR' as const, mspId: 'DistMSP' },
      };

      const result = await batchResolvers.Mutation.transferBatch(undefined, args, ctx);

      expect(mockFabricClient.transferBatch).toHaveBeenCalledWith({
        batchId: 'BATCH-2026-001',
        fromNode: 'DIST-DELHI-002',
        toNode: 'CHEM-MUM-0091',
        quantity: 500,
        gpsLocation: '19.0760,72.8777',
      });
      expect(result).toEqual({ success: true, message: 'Transfer recorded' });
    });

    it('should use empty string when gpsLocation is omitted', async () => {
      mockFabricClient.transferBatch.mockResolvedValue(undefined);

      const args = {
        batchId: 'BATCH-2026-001',
        toNode: 'CHEM-MUM-0091',
        quantity: 500,
      };

      const ctx = {
        user: { nodeId: 'DIST-DELHI-002', orgRole: 'DISTRIBUTOR' as const, mspId: 'DistMSP' },
      };

      await batchResolvers.Mutation.transferBatch(undefined, args, ctx);

      expect(mockFabricClient.transferBatch).toHaveBeenCalledWith(
        expect.objectContaining({ gpsLocation: '' }),
      );
    });
  });

  describe('Mutation.flagChemist', () => {
    it('should call fabricClient.flagChemist with correct params', async () => {
      mockFabricClient.flagChemist.mockResolvedValue(undefined);

      const args = { chemistId: 'CHEM-MUM-0091', batchId: 'BATCH-2026-001' };
      const ctx = {
        user: { nodeId: 'CDSCO-REG-001', orgRole: 'REGULATOR' as const, mspId: 'RegMSP' },
      };

      const result = await batchResolvers.Mutation.flagChemist(undefined, args, ctx);

      expect(mockFabricClient.flagChemist).toHaveBeenCalledWith({
        chemistId: 'CHEM-MUM-0091',
        batchId: 'BATCH-2026-001',
      });
      expect(result).toEqual({ success: true, message: 'Chemist flagged' });
    });
  });
});
