import { getFabricContract } from './gateway.js';
import { FabricBatch, FabricRecallRecord } from '../types/fabric.js';
import { logger } from '../logger.js';

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
  const contract = await getFabricContract();
  await contract.submitTransaction('FlagChemist', params.chemistId, params.batchId);
  logger.info({ chemistId: params.chemistId }, 'FlagChemist submitted to Fabric');
}

/**
 * Read a batch record from Fabric (evaluate = read-only, no endorsement).
 */
export async function getBatch(batchId: string): Promise<FabricBatch> {
  const contract = await getFabricContract();
  const result = await contract.evaluateTransaction('GetBatch', batchId);
  return parseResult<FabricBatch>(result);
}

/**
 * Read a recall record from Fabric.
 */
export async function getRecall(batchId: string): Promise<FabricRecallRecord> {
  const contract = await getFabricContract();
  const result = await contract.evaluateTransaction('GetRecall', batchId);
  return parseResult<FabricRecallRecord>(result);
}
