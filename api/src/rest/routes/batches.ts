import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as fabricClient from '../../fabric/client.js';

const router = Router();

const MintBatchSchema = z.object({
  batchId: z.string().min(1),
  drugName: z.string().min(1),
  composition: z.string().min(1),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD'),
  quantity: z.number().positive().int(),
  details: z.record(z.string()).optional().default({}),
});

router.post('/', requireAuth, requireRole('MANUFACTURER'), async (req, res, next) => {
  try {
    const body = MintBatchSchema.parse(req.body);
    await fabricClient.mintBatch({
      ...body,
      manufacturerId: req.user!.nodeId,
    });
    res.status(201).json({ message: 'Batch minted', batchId: body.batchId });
  } catch (err) {
    next(err);
  }
});

router.get('/:batchId', requireAuth, async (req, res, next) => {
  try {
    const batch = await fabricClient.getBatch(req.params['batchId']!);
    res.json(batch);
  } catch (err) {
    next(err);
  }
});

const TransferSchema = z.object({
  toNode: z.string().min(1),
  quantity: z.number().positive().int(),
  gpsLocation: z.string().default(''),
});

router.post('/:batchId/transfer', requireAuth, requireRole('MANUFACTURER', 'DISTRIBUTOR'), async (req, res, next) => {
  try {
    const body = TransferSchema.parse(req.body);
    await fabricClient.transferBatch({
      batchId: req.params['batchId']!,
      fromNode: req.user!.nodeId,
      ...body,
    });
    res.json({ message: 'Transfer recorded' });
  } catch (err) {
    next(err);
  }
});

const DispenseSchema = z.object({
  quantity: z.number().positive().int(),
  patientHash: z.string().length(64, 'Must be 64-char hex SHA-256'),
});

router.post('/:batchId/dispense', requireAuth, requireRole('CHEMIST'), async (req, res, next) => {
  try {
    const body = DispenseSchema.parse(req.body);
    await fabricClient.dispenseMedicine({
      batchId: req.params['batchId']!,
      chemistId: req.user!.nodeId,
      ...body,
    });
    res.json({ message: 'Dispense logged' });
  } catch (err) {
    next(err);
  }
});

export default router;
