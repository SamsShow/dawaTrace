import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
registry.setDefaultLabels({ service: 'dawatrace-api' });
collectDefaultMetrics({ register: registry });

// ── HTTP request metrics ────────────────────────────────────────────

export const httpRequestDuration = new Histogram({
  name: 'dawatrace_api_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

export const httpRequestTotal = new Counter({
  name: 'dawatrace_api_http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
});

// ── Business metrics ────────────────────────────────────────────────

export const batchesMinted = new Counter({
  name: 'dawatrace_batches_minted_total',
  help: 'Total batches minted via API',
  registers: [registry],
});

export const recallsIssued = new Counter({
  name: 'dawatrace_recalls_issued_total',
  help: 'Total recalls issued via API',
  registers: [registry],
});

export const chemistsFlagged = new Counter({
  name: 'dawatrace_chemists_flagged_total',
  help: 'Total chemists flagged via API',
  registers: [registry],
});

export const activeWebSocketConnections = new Gauge({
  name: 'dawatrace_api_websocket_connections',
  help: 'Current active WebSocket connections',
  registers: [registry],
});
