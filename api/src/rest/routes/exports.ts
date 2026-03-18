import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as fabricClient from '../../fabric/client.js';
import * as suiQueries from '../../sui/queries.js';
import { FabricBatch, FabricRecallRecord } from '../../types/fabric.js';
import { SuiCustodyRecord } from '../../types/sui.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Escape a value for CSV (wrap in quotes if it contains comma, quote, or newline). */
function csvEscape(value: unknown): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsvRow(values: unknown[]): string {
  return values.map(csvEscape).join(',');
}

// ---------------------------------------------------------------------------
// GET /api/exports/batches?format=csv|json
// ---------------------------------------------------------------------------

const BATCH_CSV_COLUMNS = [
  'batchId',
  'manufacturerId',
  'drugName',
  'composition',
  'expiryDate',
  'quantity',
  'currentCustodian',
  'status',
  'dataHash',
  'suiObjectId',
  'createdAt',
  'updatedAt',
] as const;

function batchToCsvRow(b: FabricBatch): string {
  return toCsvRow([
    b.batchId,
    b.manufacturerId,
    b.drugName,
    b.composition,
    b.expiryDate,
    b.quantity,
    b.currentCustodian,
    b.status,
    b.dataHash,
    b.suiObjectId,
    new Date(b.createdAt).toISOString(),
    new Date(b.updatedAt).toISOString(),
  ]);
}

router.get('/batches', requireAuth, requireRole('REGULATOR'), async (_req, res, next) => {
  try {
    const format = (_req.query.format as string) || 'json';
    const batches = await fabricClient.listBatches();

    if (format === 'csv') {
      const header = toCsvRow(BATCH_CSV_COLUMNS as unknown as string[]);
      const rows = batches.map(batchToCsvRow);
      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="batches-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="batches-${Date.now()}.json"`);
      res.json(batches);
    }
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/exports/recalls?format=csv|json
// ---------------------------------------------------------------------------

const RECALL_CSV_COLUMNS = [
  'batchId',
  'regulatorId',
  'reason',
  'timestamp',
  'suiTxDigest',
] as const;

function recallToCsvRow(r: FabricRecallRecord): string {
  return toCsvRow([
    r.batchId,
    r.regulatorId,
    r.reason,
    new Date(r.timestamp).toISOString(),
    r.suiTxDigest,
  ]);
}

router.get('/recalls', requireAuth, requireRole('REGULATOR'), async (_req, res, next) => {
  try {
    const format = (_req.query.format as string) || 'json';
    const recalls = await fabricClient.listRecalls();

    if (format === 'csv') {
      const header = toCsvRow(RECALL_CSV_COLUMNS as unknown as string[]);
      const rows = recalls.map(recallToCsvRow);
      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="recalls-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="recalls-${Date.now()}.json"`);
      res.json(recalls);
    }
  } catch (err) {
    next(err);
  }
});

// ---------------------------------------------------------------------------
// GET /api/exports/custody/:batchId?format=csv|json
// ---------------------------------------------------------------------------

const CUSTODY_CSV_COLUMNS = [
  'objectId',
  'batchId',
  'fromNode',
  'toNode',
  'quantity',
  'sequence',
  'timestamp',
] as const;

function custodyToCsvRow(c: SuiCustodyRecord): string {
  return toCsvRow([
    c.objectId,
    c.batchId,
    c.fromNode,
    c.toNode,
    c.quantity,
    c.sequence,
    new Date(c.timestamp).toISOString(),
  ]);
}

router.get('/custody/:batchId', requireAuth, requireRole('REGULATOR'), async (req, res, next) => {
  try {
    const format = (req.query.format as string) || 'json';
    const batchId = req.params['batchId']!;
    const chain = await suiQueries.getCustodyChain(batchId);

    if (format === 'csv') {
      const header = toCsvRow(CUSTODY_CSV_COLUMNS as unknown as string[]);
      const rows = chain.map(custodyToCsvRow);
      const csv = [header, ...rows].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="custody-${batchId}-${Date.now()}.csv"`);
      res.send(csv);
    } else {
      res.setHeader('Content-Disposition', `attachment; filename="custody-${batchId}-${Date.now()}.json"`);
      res.json(chain);
    }
  } catch (err) {
    next(err);
  }
});

export default router;
