import type { Batch, RecallRecord } from '@/lib/types';

// ---------------------------------------------------------------------------
// Static seed data for development. In production, all reads come from Sui
// on-chain state and all writes submit Sui transactions.
//
// This data is immutable — serverless-safe. No state is shared across
// invocations. Mutations are TODO stubs until Sui contracts are wired.
// ---------------------------------------------------------------------------

export interface ChemistViolation {
  chemistId: string;
  violationCount: number;
  suspended: boolean;
  violationBatchIds: string[];
  lastViolationAt: number;
}

const SEED_TIME = 1743500000000; // fixed reference point so data is stable across invocations

const BATCHES: readonly Batch[] = [
  {
    batchId: 'BATCH-2026-001',
    manufacturerId: 'SUN-PHARMA-MFG-001',
    drugName: 'Amoxicillin 500mg',
    composition: 'Amoxicillin trihydrate 574mg eq. to Amoxicillin 500mg',
    expiryDate: '2027-06-30',
    quantity: 10000,
    currentCustodian: 'DIST-DELHI-002',
    status: 'IN_TRANSIT',
    dataHash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    suiObjectId: '0xabc123def456abc123def456abc123def456abc123def456abc123def456abc123',
    createdAt: SEED_TIME - 7 * 86400000,
    updatedAt: SEED_TIME - 1 * 86400000,
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
    dataHash: 'b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    suiObjectId: '0xdef456abc123def456abc123def456abc123def456abc123def456abc123def456',
    createdAt: SEED_TIME - 14 * 86400000,
    updatedAt: SEED_TIME - 2 * 86400000,
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
    dataHash: 'c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    suiObjectId: '0x111222333444555666777888999aaabbbccc111222333444555666777888999aaa',
    createdAt: SEED_TIME - 30 * 86400000,
    updatedAt: SEED_TIME - 3600000,
  },
];

const RECALLS: readonly RecallRecord[] = [
  {
    batchId: 'BATCH-2026-003',
    regulatorId: 'CDSCO-REG-001',
    reason: 'Substandard dissolution profile detected in QC sampling — lot ZY-MET-26003 fails BP 2023 spec.',
    timestamp: SEED_TIME - 3600000,
    suiTxDigest: 'Gx9mK2pLvW4nQrTsYuZaXbCdEfHiJkMoNpRsTuVwXyZ1234567890abcdef',
  },
];

const VIOLATIONS: readonly ChemistViolation[] = [
  {
    chemistId: 'CHEM-MUM-0091',
    violationCount: 3,
    suspended: true,
    violationBatchIds: ['BATCH-2026-003', 'BATCH-2026-007', 'BATCH-2026-012'],
    lastViolationAt: SEED_TIME - 2 * 86400000,
  },
  {
    chemistId: 'CHEM-DEL-0045',
    violationCount: 1,
    suspended: false,
    violationBatchIds: ['BATCH-2026-005'],
    lastViolationAt: SEED_TIME - 10 * 86400000,
  },
  {
    chemistId: 'CHEM-BLR-0112',
    violationCount: 2,
    suspended: false,
    violationBatchIds: ['BATCH-2026-002', 'BATCH-2026-009'],
    lastViolationAt: SEED_TIME - 5 * 86400000,
  },
];

// -- Queries (return static seed data) --------------------------------------

export async function getBatch(batchId: string): Promise<Batch> {
  const batch = BATCHES.find((b) => b.batchId === batchId);
  if (!batch) throw new Error(`Batch ${batchId} not found`);
  return batch;
}

export async function listBatches(): Promise<Batch[]> {
  return [...BATCHES];
}

export async function getRecall(batchId: string): Promise<RecallRecord> {
  const recall = RECALLS.find((r) => r.batchId === batchId);
  if (!recall) throw new Error(`Recall for ${batchId} not found`);
  return recall;
}

export async function listRecalls(): Promise<RecallRecord[]> {
  return [...RECALLS];
}

export async function getChemistViolation(chemistId: string): Promise<ChemistViolation> {
  const violation = VIOLATIONS.find((v) => v.chemistId === chemistId);
  if (!violation) throw new Error(`Violation record for ${chemistId} not found`);
  return violation;
}

export async function listChemistViolations(): Promise<ChemistViolation[]> {
  return [...VIOLATIONS];
}

// -- Mutations (stubs — wire to Sui transactions) ---------------------------
// TODO: Replace each stub with a Sui PTB (programmable transaction block)
// that calls the corresponding Move function on-chain.

export async function mintBatch(_params: {
  batchId: string;
  manufacturerId: string;
  drugName: string;
  composition: string;
  expiryDate: string;
  details: Record<string, string>;
  quantity: number;
}): Promise<void> {
  // TODO: Submit sui::dawa_trace::batch::mint_batch PTB
}

export async function transferBatch(_params: {
  batchId: string;
  fromNode: string;
  toNode: string;
  quantity: number;
  gpsLocation: string;
}): Promise<void> {
  // TODO: Submit sui::dawa_trace::custody::record_transfer PTB
}

export async function issueRecall(_params: {
  batchId: string;
  regulatorId: string;
  reason: string;
}): Promise<void> {
  // TODO: Submit sui::dawa_trace::batch::mark_recalled PTB
}

export async function flagChemist(_params: { chemistId: string; batchId: string }): Promise<void> {
  // TODO: Implement chemist flagging on Sui
}

export async function liftSuspension(_params: { chemistId: string; regulatorId: string }): Promise<void> {
  // TODO: Implement suspension lift on Sui
}
