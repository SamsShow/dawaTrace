import { Router } from 'express';
import { getFabricContract } from '../../fabric/gateway.js';
import { getSuiClient } from '../../sui/client.js';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/ready', async (_req, res) => {
  const checks: Record<string, string> = {};

  try {
    await getFabricContract();
    checks['fabric'] = 'ok';
  } catch {
    checks['fabric'] = 'error';
  }

  try {
    await getSuiClient().getLatestSuiSystemState();
    checks['sui'] = 'ok';
  } catch {
    checks['sui'] = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');
  res.status(allOk ? 200 : 503).json({ status: allOk ? 'ready' : 'not_ready', checks });
});

export default router;
