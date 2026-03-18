import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export const registry = new Registry();
registry.setDefaultLabels({ service: 'dawatrace-bridge' });
collectDefaultMetrics({ register: registry });

// ── Event processing metrics ────────────────────────────────────────

export const eventProcessingDuration = new Histogram({
  name: 'dawatrace_bridge_event_processing_seconds',
  help: 'Time to process and anchor a Fabric event on Sui',
  labelNames: ['event_type'] as const,
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60],
  registers: [registry],
});

export const recallSLADuration = new Histogram({
  name: 'dawatrace_bridge_recall_sla_seconds',
  help: 'Recall anchor duration (SLA target: <60s)',
  buckets: [1, 5, 10, 20, 30, 45, 60, 90, 120],
  registers: [registry],
});

export const eventsProcessed = new Counter({
  name: 'dawatrace_bridge_events_processed_total',
  help: 'Total events processed',
  labelNames: ['event_type', 'result'] as const,
  registers: [registry],
});

// ── Queue metrics ───────────────────────────────────────────────────

export const queueDepth = new Gauge({
  name: 'dawatrace_bridge_queue_depth',
  help: 'Current queue depth',
  labelNames: ['priority'] as const,
  registers: [registry],
});

export const deadLetterCount = new Counter({
  name: 'dawatrace_bridge_dead_letters_total',
  help: 'Total dead-lettered events',
  labelNames: ['event_type'] as const,
  registers: [registry],
});

// ── Sui transaction metrics ─────────────────────────────────────────

export const suiTxTotal = new Counter({
  name: 'dawatrace_bridge_sui_tx_total',
  help: 'Total Sui transactions submitted',
  labelNames: ['status'] as const,
  registers: [registry],
});

export const suiTxDuration = new Histogram({
  name: 'dawatrace_bridge_sui_tx_duration_seconds',
  help: 'Sui transaction submission duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  registers: [registry],
});
