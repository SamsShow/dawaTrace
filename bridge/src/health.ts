import express from 'express';
import { config } from './config.js';
import { logger } from './logger.js';
import { RetryQueue } from './queue.js';
import { BridgeRelay } from './relay.js';
import { registry, queueDepth } from './metrics.js';

/**
 * Starts an HTTP health server for C-DAC ops monitoring.
 * Exposes:
 * - GET /health — liveness check (always 200 if process is alive)
 * - GET /ready  — readiness check (200 if relay is connected and queue is healthy)
 * - GET /status — detailed status (queue depths, last anchored block, uptime)
 */
export function startHealthServer(relay: BridgeRelay, queue: RetryQueue): void {
  const app = express();
  const startTime = Date.now();

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: Date.now() - startTime });
  });

  // Prometheus metrics endpoint
  app.get('/metrics', async (_req, res) => {
    try {
      // Update queue depth gauges before scraping
      const depths = await queue.depths();
      queueDepth.set({ priority: 'URGENT' }, depths.urgent);
      queueDepth.set({ priority: 'NORMAL' }, depths.normal);

      res.set('Content-Type', registry.contentType);
      res.end(await registry.metrics());
    } catch (err) {
      res.status(500).end(String(err));
    }
  });

  app.get('/ready', async (_req, res) => {
    const depths = await queue.depths();
    // Not ready if URGENT queue has >10 items (bridge falling behind)
    if (depths.urgent > 10) {
      res.status(503).json({ status: 'not_ready', reason: 'urgent_queue_backlog', depths });
      return;
    }
    res.json({ status: 'ready', depths });
  });

  app.get('/status', async (_req, res) => {
    const depths = await queue.depths();
    res.json({
      status: 'ok',
      uptime: Date.now() - startTime,
      lastAnchoredBlock: relay.getLastAnchoredBlock().toString(),
      queue: depths,
      suiRpcUrl: config.SUI_RPC_URL,
      fabricEndpoint: config.FABRIC_GATEWAY_ENDPOINT,
    });
  });

  app.listen(config.BRIDGE_HEALTH_PORT, () => {
    logger.info({ port: config.BRIDGE_HEALTH_PORT }, 'Bridge health server started');
  });
}
