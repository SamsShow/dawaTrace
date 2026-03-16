import { Redis } from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';
import * as fs from 'fs';
import * as path from 'path';

export type Priority = 'URGENT' | 'NORMAL';

export interface QueuedEvent {
  id: string;
  priority: Priority;
  eventType: string;
  payload: Record<string, unknown>;
  attempts: number;
  firstEnqueuedAt: number;
  lastAttemptAt: number | null;
  nextRetryAt: number;
}

const URGENT_QUEUE_KEY = 'bridge:queue:urgent';
const NORMAL_QUEUE_KEY = 'bridge:queue:normal';
const DEAD_LETTER_DIR = path.join(process.cwd(), 'dead-letter');
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 1000; // 1s, 2s, 4s, 8s, 16s

/**
 * Priority retry queue for Fabric→Sui bridge events.
 *
 * Two lanes:
 * - URGENT: RecallEvents — processed first, critical for <60s recall SLA
 * - NORMAL: MintEvents, TransferEvents — best effort
 *
 * Backed by Redis in production (configure REDIS_URL).
 * Falls back to in-memory Map if Redis is unavailable (dev only).
 *
 * Dead-lettered events (5 failed attempts) are written to ./dead-letter/
 * as JSONL files for manual intervention by C-DAC ops team.
 */
export class RetryQueue {
  private redis: Redis | null = null;
  private inMemory: Map<string, QueuedEvent> = new Map();
  private useRedis: boolean;

  constructor() {
    this.useRedis = config.NODE_ENV === 'production';

    if (this.useRedis) {
      this.redis = new Redis(config.REDIS_URL, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });
      this.redis.on('error', (err) => {
        logger.error({ err }, 'Redis connection error — falling back to in-memory queue');
        this.useRedis = false;
      });
    }

    // Ensure dead-letter directory exists
    if (!fs.existsSync(DEAD_LETTER_DIR)) {
      fs.mkdirSync(DEAD_LETTER_DIR, { recursive: true });
    }
  }

  async connect(): Promise<void> {
    if (this.redis) {
      await this.redis.connect();
      logger.info('Redis connected for bridge retry queue');
    }
  }

  /**
   * Enqueue an event for processing.
   * URGENT events are always dequeued before NORMAL events.
   */
  async enqueue(event: Omit<QueuedEvent, 'attempts' | 'firstEnqueuedAt' | 'lastAttemptAt' | 'nextRetryAt'>): Promise<void> {
    const queued: QueuedEvent = {
      ...event,
      attempts: 0,
      firstEnqueuedAt: Date.now(),
      lastAttemptAt: null,
      nextRetryAt: Date.now(),
    };

    if (this.useRedis && this.redis) {
      const queueKey = event.priority === 'URGENT' ? URGENT_QUEUE_KEY : NORMAL_QUEUE_KEY;
      // Use score = nextRetryAt for sorted set (sorted by scheduled time)
      await this.redis.zadd(queueKey, queued.nextRetryAt, JSON.stringify(queued));
    } else {
      this.inMemory.set(queued.id, queued);
    }

    logger.info({ eventId: queued.id, priority: queued.priority, eventType: queued.eventType }, 'Event enqueued');
  }

  /**
   * Dequeue the next event ready for processing.
   * Always drains URGENT queue first.
   */
  async dequeue(): Promise<QueuedEvent | null> {
    const now = Date.now();

    if (this.useRedis && this.redis) {
      // Try urgent queue first
      for (const queueKey of [URGENT_QUEUE_KEY, NORMAL_QUEUE_KEY]) {
        const results = await this.redis.zrangebyscore(queueKey, '-inf', now, 'LIMIT', 0, 1);
        if (results.length > 0) {
          await this.redis.zrem(queueKey, results[0]);
          return JSON.parse(results[0]) as QueuedEvent;
        }
      }
      return null;
    }

    // In-memory: find next ready event (urgent first)
    let next: QueuedEvent | null = null;
    for (const event of this.inMemory.values()) {
      if (event.nextRetryAt > now) continue;
      if (!next) {
        next = event;
        continue;
      }
      // Prefer URGENT, then earliest nextRetryAt
      if (event.priority === 'URGENT' && next.priority !== 'URGENT') {
        next = event;
      } else if (event.priority === next.priority && event.nextRetryAt < next.nextRetryAt) {
        next = event;
      }
    }
    if (next) {
      this.inMemory.delete(next.id);
    }
    return next;
  }

  /**
   * Re-enqueue a failed event with exponential backoff.
   * After MAX_ATTEMPTS, writes to dead-letter file and alerts.
   */
  async requeueWithBackoff(event: QueuedEvent, error: Error): Promise<void> {
    event.attempts++;
    event.lastAttemptAt = Date.now();

    if (event.attempts >= MAX_ATTEMPTS) {
      logger.error(
        { eventId: event.id, attempts: event.attempts, error: error.message },
        'Event dead-lettered after max attempts — manual intervention required'
      );
      this.writeDeadLetter(event, error);
      return;
    }

    const backoffMs = BASE_BACKOFF_MS * Math.pow(2, event.attempts - 1);
    event.nextRetryAt = Date.now() + backoffMs;

    logger.warn(
      { eventId: event.id, attempts: event.attempts, backoffMs, eventType: event.eventType },
      'Event requeued with backoff'
    );

    if (this.useRedis && this.redis) {
      const queueKey = event.priority === 'URGENT' ? URGENT_QUEUE_KEY : NORMAL_QUEUE_KEY;
      await this.redis.zadd(queueKey, event.nextRetryAt, JSON.stringify(event));
    } else {
      this.inMemory.set(event.id, event);
    }
  }

  /** Returns queue depths for health endpoint. */
  async depths(): Promise<{ urgent: number; normal: number }> {
    if (this.useRedis && this.redis) {
      const [urgent, normal] = await Promise.all([
        this.redis.zcard(URGENT_QUEUE_KEY),
        this.redis.zcard(NORMAL_QUEUE_KEY),
      ]);
      return { urgent, normal };
    }
    let urgent = 0, normal = 0;
    for (const e of this.inMemory.values()) {
      if (e.priority === 'URGENT') urgent++;
      else normal++;
    }
    return { urgent, normal };
  }

  private writeDeadLetter(event: QueuedEvent, error: Error): void {
    const filename = path.join(DEAD_LETTER_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-${event.id}.jsonl`);
    const line = JSON.stringify({ event, error: error.message, deadLetteredAt: new Date().toISOString() });
    fs.writeFileSync(filename, line + '\n', 'utf-8');
    logger.error({ filename }, 'Dead letter written — alert C-DAC ops team');
  }
}
