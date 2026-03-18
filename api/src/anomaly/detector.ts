import { FabricBatch } from '../types/fabric.js';

export interface AnomalyAlert {
  batchId: string;
  type: 'QUANTITY_MISMATCH' | 'EXPIRED_DISPENSED' | 'SUSPENDED_CHEMIST' | 'RAPID_TRANSFER';
  description: string;
  detectedAt: number;
}

/** Minimum time (ms) a batch should take before reaching IN_TRANSIT status. */
const RAPID_TRANSFER_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

/**
 * Run deterministic threshold-based anomaly detection rules against a list of
 * Fabric batches. Returns alerts sorted by detectedAt descending.
 */
export function detectAnomalies(batches: FabricBatch[], limit?: number): AnomalyAlert[] {
  const now = Date.now();
  const alerts: AnomalyAlert[] = [];

  for (const batch of batches) {
    // Rule 1: EXPIRED_DISPENSED — expired batch still marked ACTIVE or IN_TRANSIT
    const expiryMs = new Date(batch.expiryDate).getTime();
    if (expiryMs < now && (batch.status === 'ACTIVE' || batch.status === 'IN_TRANSIT')) {
      alerts.push({
        batchId: batch.batchId,
        type: 'EXPIRED_DISPENSED',
        description: `Batch ${batch.batchId} expired on ${batch.expiryDate} but status is still ${batch.status}`,
        detectedAt: now,
      });
    }

    // Rule 2: QUANTITY_MISMATCH — quantity is 0 or negative
    if (batch.quantity <= 0) {
      alerts.push({
        batchId: batch.batchId,
        type: 'QUANTITY_MISMATCH',
        description: `Batch ${batch.batchId} has invalid quantity: ${batch.quantity}`,
        detectedAt: now,
      });
    }

    // Rule 3: RAPID_TRANSFER — reached IN_TRANSIT suspiciously fast
    if (
      batch.status === 'IN_TRANSIT' &&
      batch.updatedAt - batch.createdAt < RAPID_TRANSFER_THRESHOLD_MS
    ) {
      alerts.push({
        batchId: batch.batchId,
        type: 'RAPID_TRANSFER',
        description: `Batch ${batch.batchId} moved to IN_TRANSIT within ${Math.round((batch.updatedAt - batch.createdAt) / 1000)}s of creation`,
        detectedAt: now,
      });
    }

    // Rule 4: SUSPENDED_CHEMIST — chemist custodian with batch under review
    if (batch.currentCustodian.startsWith('CHEM') && batch.status === 'SUSPENDED_REVIEW') {
      alerts.push({
        batchId: batch.batchId,
        type: 'SUSPENDED_CHEMIST',
        description: `Batch ${batch.batchId} held by suspended chemist ${batch.currentCustodian}`,
        detectedAt: now,
      });
    }
  }

  // Sort by detectedAt descending (stable for same timestamp, preserves insertion order)
  alerts.sort((a, b) => b.detectedAt - a.detectedAt);

  return limit != null ? alerts.slice(0, limit) : alerts;
}
