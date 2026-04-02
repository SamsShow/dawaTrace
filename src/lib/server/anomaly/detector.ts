import type { Batch } from '@/lib/types';

export interface AnomalyAlert {
  batchId: string;
  type: 'QUANTITY_MISMATCH' | 'EXPIRED_DISPENSED' | 'SUSPENDED_CHEMIST' | 'RAPID_TRANSFER';
  description: string;
  detectedAt: number;
}

const RAPID_TRANSFER_THRESHOLD_MS = 60 * 60 * 1000;

export function detectAnomalies(batches: Batch[], limit?: number): AnomalyAlert[] {
  const now = Date.now();
  const alerts: AnomalyAlert[] = [];

  for (const batch of batches) {
    const expiryMs = new Date(batch.expiryDate).getTime();
    if (expiryMs < now && (batch.status === 'ACTIVE' || batch.status === 'IN_TRANSIT')) {
      alerts.push({
        batchId: batch.batchId,
        type: 'EXPIRED_DISPENSED',
        description: `Batch ${batch.batchId} expired on ${batch.expiryDate} but status is still ${batch.status}`,
        detectedAt: now,
      });
    }

    if (batch.quantity <= 0) {
      alerts.push({
        batchId: batch.batchId,
        type: 'QUANTITY_MISMATCH',
        description: `Batch ${batch.batchId} has invalid quantity: ${batch.quantity}`,
        detectedAt: now,
      });
    }

    if (batch.status === 'IN_TRANSIT' && batch.updatedAt - batch.createdAt < RAPID_TRANSFER_THRESHOLD_MS) {
      alerts.push({
        batchId: batch.batchId,
        type: 'RAPID_TRANSFER',
        description: `Batch ${batch.batchId} moved to IN_TRANSIT within ${Math.round((batch.updatedAt - batch.createdAt) / 1000)}s of creation`,
        detectedAt: now,
      });
    }

    if (batch.currentCustodian.startsWith('CHEM') && batch.status === 'SUSPENDED_REVIEW') {
      alerts.push({
        batchId: batch.batchId,
        type: 'SUSPENDED_CHEMIST',
        description: `Batch ${batch.batchId} held by suspended chemist ${batch.currentCustodian}`,
        detectedAt: now,
      });
    }
  }

  alerts.sort((a, b) => b.detectedAt - a.detectedAt);
  return limit != null ? alerts.slice(0, limit) : alerts;
}
