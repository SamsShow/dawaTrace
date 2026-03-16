import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole } from '../middleware/auth.js';
import * as fabricClient from '../../fabric/client.js';
import { logger } from '../../logger.js';

const router = Router();

const IssueRecallSchema = z.object({
  batchId: z.string().min(1),
  reason: z.string().min(10, 'Reason must be at least 10 characters'),
});

router.post('/', requireAuth, requireRole('REGULATOR'), async (req, res, next) => {
  try {
    const body = IssueRecallSchema.parse(req.body);
    const startMs = Date.now();

    await fabricClient.issueRecall({
      batchId: body.batchId,
      regulatorId: req.user!.nodeId,
      reason: body.reason,
    });

    const elapsedMs = Date.now() - startMs;
    logger.warn({ batchId: body.batchId, elapsedMs }, 'Recall issued — bridge SLA clock running');

    res.status(202).json({
      message: 'Recall issued — bridge will anchor to Sui within 60 seconds',
      batchId: body.batchId,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:batchId', requireAuth, async (req, res, next) => {
  try {
    const recall = await fabricClient.getRecall(req.params['batchId']!);
    res.json(recall);
  } catch (err) {
    next(err);
  }
});

export default router;
