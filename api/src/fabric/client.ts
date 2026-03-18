import { getFabricContract } from './gateway.js';
import { FabricBatch, FabricRecallRecord, FabricChemistViolation } from '../types/fabric.js';
import { logger } from '../logger.js';

const MOCK = process.env.MOCK_FABRIC === 'true';

const now = Date.now();
const MOCK_BATCHES: FabricBatch[] = [
  {
    batchId: 'BATCH-2026-001',
    manufacturerId: 'SUN-PHARMA-MFG-001',
    drugName: 'Amoxicillin 500mg',
    composition: 'Amoxicillin trihydrate 574mg eq. to Amoxicillin 500mg',
    expiryDate: '2027-06-30',
    quantity: 10000,
    currentCustodian: 'DIST-DELHI-002',
    status: 'IN_TRANSIT',
    details: { licenseNo: 'MFG-DL-2024-1182', batchRef: 'SP-AMX-26001' },
    dataHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    suiObjectId: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123',
    createdAt: now - 7 * 86400000,
    updatedAt: now - 1 * 86400000,
  },
  {
    batchId: 'BATCH-2026-002',
    manufacturerId: 'CIPLA-MFG-001',
    drugName: 'Paracetamol 650mg',
    composition: 'Paracetamol IP 650mg',
    expiryDate: '2027-12-31',
    quantity: 25000,
    currentCustodian: 'CHEM-MUM-0091',
    status: 'ACTIVE',
    details: { licenseNo: 'MFG-MH-2024-0391', batchRef: 'CI-PCT-26002' },
    dataHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    suiObjectId: '0xdef456abc123def456abc123def456abc123def456abc123def456abc123def456',
    createdAt: now - 14 * 86400000,
    updatedAt: now - 2 * 86400000,
  },
  {
    batchId: 'BATCH-2026-003',
    manufacturerId: 'ZYDUS-MFG-002',
    drugName: 'Metformin 500mg',
    composition: 'Metformin Hydrochloride IP 500mg',
    expiryDate: '2026-09-30',
    quantity: 5000,
    currentCustodian: 'CDSCO-REG-001',
    status: 'RECALLED',
    details: { licenseNo: 'MFG-GJ-2023-0714', batchRef: 'ZY-MET-26003' },
    dataHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    suiObjectId: '0x111222333444555666777888999aaabbbccc111222333444555666777888999aaa',
    createdAt: now - 30 * 86400000,
    updatedAt: now - 3600000,
  },
];

const MOCK_RECALLS: FabricRecallRecord[] = [
  {
    batchId: 'BATCH-2026-003',
    regulatorId: 'CDSCO-REG-001',
    reason: 'Substandard dissolution profile detected in QC sampling — lot ZY-MET-26003 fails BP 2023 spec.',
    timestamp: now - 3600000,
    suiTxDigest: 'Gx9mK2pLvW4nQrTsYuZaXbCdEfHiJkMoNpRsTuVwXyZ1234567890abcdef',
  },
];

function parseResult<T>(resultBytes: Uint8Array): T {
  return JSON.parse(Buffer.from(resultBytes).toString('utf-8')) as T;
}

/**
 * Mint a new pharmaceutical batch on the Fabric ledger.
 */
export async function mintBatch(params: {
  batchId: string;
  manufacturerId: string;
  drugName: string;
  composition: string;
  expiryDate: string;
  details: Record<string, string>;
  quantity: number;
}): Promise<void> {
  if (MOCK) { logger.info({ batchId: params.batchId }, '[MOCK] MintBatch'); return; }
  const contract = await getFabricContract();
  await contract.submitTransaction(
    'MintBatch',
    params.batchId,
    params.manufacturerId,
    params.drugName,
    params.composition,
    params.expiryDate,
    JSON.stringify(params.details),
    String(params.quantity),
  );
  logger.info({ batchId: params.batchId }, 'MintBatch submitted to Fabric');
}

/**
 * Transfer batch custody between supply chain nodes.
 */
export async function transferBatch(params: {
  batchId: string;
  fromNode: string;
  toNode: string;
  quantity: number;
  gpsLocation: string;
}): Promise<void> {
  if (MOCK) { logger.info({ batchId: params.batchId }, '[MOCK] TransferBatch'); return; }
  const contract = await getFabricContract();
  await contract.submitTransaction(
    'TransferBatch',
    params.batchId,
    params.fromNode,
    params.toNode,
    String(params.quantity),
    params.gpsLocation,
  );
  logger.info({ batchId: params.batchId, toNode: params.toNode }, 'TransferBatch submitted to Fabric');
}

/**
 * Log a chemist dispensing event.
 * PatientHash must be SHA-256(aadhaar+batchId+timestamp) — never raw Aadhaar.
 */
export async function dispenseMedicine(params: {
  batchId: string;
  chemistId: string;
  quantity: number;
  patientHash: string;
}): Promise<void> {
  if (MOCK) { logger.info({ batchId: params.batchId }, '[MOCK] DispenseMedicine'); return; }
  const contract = await getFabricContract();
  await contract.submitTransaction(
    'DispenseMedicine',
    params.batchId,
    params.chemistId,
    String(params.quantity),
    params.patientHash,
  );
  logger.info({ batchId: params.batchId, chemistId: params.chemistId }, 'DispenseMedicine submitted to Fabric');
}

/**
 * Issue a recall for a batch. Bridge relay must anchor this to Sui within 60 seconds.
 */
export async function issueRecall(params: {
  batchId: string;
  regulatorId: string;
  reason: string;
}): Promise<void> {
  if (MOCK) { logger.warn({ batchId: params.batchId }, '[MOCK] IssueRecall'); return; }
  const contract = await getFabricContract();
  await contract.submitTransaction(
    'IssueRecall',
    params.batchId,
    params.regulatorId,
    params.reason,
  );
  logger.warn({ batchId: params.batchId }, 'IssueRecall submitted to Fabric — bridge SLA clock starts');
}

/**
 * Flag a chemist for selling an unverified batch.
 */
export async function flagChemist(params: {
  chemistId: string;
  batchId: string;
}): Promise<void> {
  if (MOCK) { logger.info({ chemistId: params.chemistId }, '[MOCK] FlagChemist'); return; }
  const contract = await getFabricContract();
  await contract.submitTransaction('FlagChemist', params.chemistId, params.batchId);
  logger.info({ chemistId: params.chemistId }, 'FlagChemist submitted to Fabric');
}

/**
 * Read a batch record from Fabric (evaluate = read-only, no endorsement).
 */
export async function getBatch(batchId: string): Promise<FabricBatch> {
  if (MOCK) {
    const batch = MOCK_BATCHES.find((b) => b.batchId === batchId);
    if (!batch) throw new Error(`[MOCK] Batch ${batchId} not found`);
    return batch;
  }
  const contract = await getFabricContract();
  const result = await contract.evaluateTransaction('GetBatch', batchId);
  return parseResult<FabricBatch>(result);
}

export async function listBatches(): Promise<FabricBatch[]> {
  if (MOCK) return MOCK_BATCHES;
  const contract = await getFabricContract();
  const result = await contract.evaluateTransaction('GetAllBatches');
  return parseResult<FabricBatch[]>(result);
}

/**
 * Read a recall record from Fabric.
 */
export async function getRecall(batchId: string): Promise<FabricRecallRecord> {
  if (MOCK) {
    const recall = MOCK_RECALLS.find((r) => r.batchId === batchId);
    if (!recall) throw new Error(`[MOCK] Recall for ${batchId} not found`);
    return recall;
  }
  const contract = await getFabricContract();
  const result = await contract.evaluateTransaction('GetRecall', batchId);
  return parseResult<FabricRecallRecord>(result);
}

export async function listRecalls(): Promise<FabricRecallRecord[]> {
  if (MOCK) return MOCK_RECALLS;
  const contract = await getFabricContract();
  const result = await contract.evaluateTransaction('GetAllRecalls');
  return parseResult<FabricRecallRecord[]>(result);
}

// --- Chemist violation management ---

const MOCK_VIOLATIONS: FabricChemistViolation[] = [
  {
    chemistId: 'CHEM-MUM-0091',
    violationCount: 3,
    suspended: true,
    violationBatchIds: ['BATCH-2026-003', 'BATCH-2026-007', 'BATCH-2026-012'],
    lastViolationAt: now - 2 * 86400000,
  },
  {
    chemistId: 'CHEM-DEL-0045',
    violationCount: 1,
    suspended: false,
    violationBatchIds: ['BATCH-2026-005'],
    lastViolationAt: now - 10 * 86400000,
  },
  {
    chemistId: 'CHEM-BLR-0112',
    violationCount: 2,
    suspended: false,
    violationBatchIds: ['BATCH-2026-002', 'BATCH-2026-009'],
    lastViolationAt: now - 5 * 86400000,
  },
];

/**
 * Read a single chemist's violation record from Fabric.
 */
export async function getChemistViolation(chemistId: string): Promise<FabricChemistViolation> {
  if (MOCK) {
    const violation = MOCK_VIOLATIONS.find((v) => v.chemistId === chemistId);
    if (!violation) throw new Error(`[MOCK] Violation record for ${chemistId} not found`);
    return violation;
  }
  const contract = await getFabricContract();
  const result = await contract.evaluateTransaction('GetChemistViolation', chemistId);
  return parseResult<FabricChemistViolation>(result);
}

/**
 * List all chemist violation records from Fabric.
 */
export async function listChemistViolations(): Promise<FabricChemistViolation[]> {
  if (MOCK) return MOCK_VIOLATIONS;
  const contract = await getFabricContract();
  const result = await contract.evaluateTransaction('GetAllChemistViolations');
  return parseResult<FabricChemistViolation[]>(result);
}

/**
 * Lift a chemist's suspension — resets violation count and unsuspends.
 * Only regulators should call this.
 */
export async function liftSuspension(params: {
  chemistId: string;
  regulatorId: string;
}): Promise<void> {
  if (MOCK) {
    const violation = MOCK_VIOLATIONS.find((v) => v.chemistId === params.chemistId);
    if (violation) violation.suspended = false;
    logger.info({ chemistId: params.chemistId }, '[MOCK] LiftSuspension');
    return;
  }
  const contract = await getFabricContract();
  await contract.submitTransaction('LiftSuspension', params.chemistId, params.regulatorId);
  logger.info({ chemistId: params.chemistId, regulatorId: params.regulatorId }, 'LiftSuspension submitted to Fabric');
}
