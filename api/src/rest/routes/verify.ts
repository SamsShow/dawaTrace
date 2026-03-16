import { Router } from 'express';
import * as suiQueries from '../../sui/queries.js';

const router = Router();

/**
 * Public endpoint — no auth required.
 * Called by patient app and export partner health authorities.
 * Reads directly from Sui (public, no Fabric access needed).
 */
router.get('/:suiObjectId', async (req, res, next) => {
  try {
    const result = await suiQueries.verifyBatch(req.params['suiObjectId']!);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
