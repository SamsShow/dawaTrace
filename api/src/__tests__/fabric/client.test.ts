import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';

// Use vi.hoisted to set env before any module loads
const { setMockEnv } = vi.hoisted(() => {
  return {
    setMockEnv: () => {
      process.env.MOCK_FABRIC = 'true';
    },
  };
});

// Set env before mocks are processed
setMockEnv();

vi.mock('../../fabric/gateway.js', () => ({
  getFabricContract: vi.fn(),
}));

vi.mock('../../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../config.js', () => ({
  config: {
    FABRIC_GATEWAY_ENDPOINT: 'localhost:7051',
    FABRIC_TLS_CERT_PATH: '/tmp/fake-cert.pem',
    FABRIC_CHANNEL_NAME: 'dawaTrace-channel',
    FABRIC_CHAINCODE_NAME: 'dawaTrace',
    FABRIC_MSP_ID: 'TestMSP',
    FABRIC_CERT_PATH: '/tmp/fake-cert.pem',
    FABRIC_KEY_PATH: '/tmp/fake-key.pem',
    SUI_RPC_URL: 'https://fullnode.devnet.sui.io:443',
    BRIDGE_PACKAGE_ID: '0x0',
    API_PORT: 3000,
    API_JWT_SECRET: 'test-secret-that-is-at-least-32-chars-long',
    API_CORS_ORIGINS: 'http://localhost:5173',
    NODE_ENV: 'test',
  },
}));

import {
  getBatch,
  listBatches,
  listRecalls,
  mintBatch,
  issueRecall,
  flagChemist,
} from '../../fabric/client.js';

describe('fabric client (mock mode)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mock mode behavior', () => {
    it('should return mock data when MOCK_FABRIC is true', async () => {
      const batches = await listBatches();
      expect(batches).toBeDefined();
      expect(Array.isArray(batches)).toBe(true);
      expect(batches.length).toBeGreaterThan(0);
    });

    it('mintBatch should resolve without error in mock mode', async () => {
      await expect(
        mintBatch({
          batchId: 'BATCH-TEST-001',
          manufacturerId: 'MFG-001',
          drugName: 'Test Drug',
          composition: 'Test composition',
          expiryDate: '2028-01-01',
          quantity: 1000,
          details: { test: 'true' },
        }),
      ).resolves.toBeUndefined();
    });

    it('issueRecall should resolve without error in mock mode', async () => {
      await expect(
        issueRecall({
          batchId: 'BATCH-2026-003',
          regulatorId: 'CDSCO-REG-001',
          reason: 'QC failure',
        }),
      ).resolves.toBeUndefined();
    });

    it('flagChemist should resolve without error in mock mode', async () => {
      await expect(
        flagChemist({
          chemistId: 'CHEM-MUM-0091',
          batchId: 'BATCH-2026-001',
        }),
      ).resolves.toBeUndefined();
    });
  });

  describe('getBatch', () => {
    it('should return the correct batch for BATCH-2026-001', async () => {
      const batch = await getBatch('BATCH-2026-001');

      expect(batch.batchId).toBe('BATCH-2026-001');
      expect(batch.drugName).toBe('Amoxicillin 500mg');
      expect(batch.status).toBe('IN_TRANSIT');
      expect(batch.manufacturerId).toBe('SUN-PHARMA-MFG-001');
    });

    it('should return the correct batch for BATCH-2026-002', async () => {
      const batch = await getBatch('BATCH-2026-002');

      expect(batch.batchId).toBe('BATCH-2026-002');
      expect(batch.drugName).toBe('Paracetamol 650mg');
      expect(batch.status).toBe('ACTIVE');
    });

    it('should return the recalled batch BATCH-2026-003', async () => {
      const batch = await getBatch('BATCH-2026-003');

      expect(batch.batchId).toBe('BATCH-2026-003');
      expect(batch.drugName).toBe('Metformin 500mg');
      expect(batch.status).toBe('RECALLED');
    });

    it('should throw for an unknown batch ID', async () => {
      await expect(getBatch('BATCH-NONEXISTENT')).rejects.toThrow(
        '[MOCK] Batch BATCH-NONEXISTENT not found',
      );
    });
  });

  describe('listBatches', () => {
    it('should return all 3 mock batches', async () => {
      const batches = await listBatches();

      expect(batches).toHaveLength(3);

      const ids = batches.map((b) => b.batchId);
      expect(ids).toContain('BATCH-2026-001');
      expect(ids).toContain('BATCH-2026-002');
      expect(ids).toContain('BATCH-2026-003');
    });

    it('should return batches with all required fields', async () => {
      const batches = await listBatches();

      for (const batch of batches) {
        expect(batch).toHaveProperty('batchId');
        expect(batch).toHaveProperty('manufacturerId');
        expect(batch).toHaveProperty('drugName');
        expect(batch).toHaveProperty('composition');
        expect(batch).toHaveProperty('expiryDate');
        expect(batch).toHaveProperty('quantity');
        expect(batch).toHaveProperty('currentCustodian');
        expect(batch).toHaveProperty('status');
        expect(batch).toHaveProperty('dataHash');
        expect(batch).toHaveProperty('suiObjectId');
        expect(batch).toHaveProperty('createdAt');
        expect(batch).toHaveProperty('updatedAt');
      }
    });
  });

  describe('listRecalls', () => {
    it('should return mock recalls', async () => {
      const recalls = await listRecalls();

      expect(recalls).toHaveLength(1);
      expect(recalls[0].batchId).toBe('BATCH-2026-003');
      expect(recalls[0].regulatorId).toBe('CDSCO-REG-001');
      expect(recalls[0].reason).toContain('dissolution profile');
    });

    it('should return recalls with all required fields', async () => {
      const recalls = await listRecalls();

      for (const recall of recalls) {
        expect(recall).toHaveProperty('batchId');
        expect(recall).toHaveProperty('regulatorId');
        expect(recall).toHaveProperty('reason');
        expect(recall).toHaveProperty('timestamp');
        expect(recall).toHaveProperty('suiTxDigest');
      }
    });
  });
});
