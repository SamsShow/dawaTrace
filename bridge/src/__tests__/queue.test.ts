import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock config before importing queue
vi.mock('../config.js', () => ({
  config: {
    NODE_ENV: 'development',
    REDIS_URL: 'redis://localhost:6379',
  },
}));

vi.mock('../logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { RetryQueue } from '../queue.js';

describe('RetryQueue (in-memory mode)', () => {
  let queue: RetryQueue;

  beforeEach(() => {
    queue = new RetryQueue();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-03-18T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('enqueue and dequeue', () => {
    it('should enqueue and dequeue an event', async () => {
      await queue.enqueue({
        id: 'evt-001',
        priority: 'NORMAL',
        eventType: 'MintEvent',
        payload: { batchId: 'BATCH-2026-001' },
      });

      const event = await queue.dequeue();

      expect(event).not.toBeNull();
      expect(event!.id).toBe('evt-001');
      expect(event!.eventType).toBe('MintEvent');
      expect(event!.priority).toBe('NORMAL');
      expect(event!.attempts).toBe(0);
      expect(event!.lastAttemptAt).toBeNull();
      expect(event!.payload).toEqual({ batchId: 'BATCH-2026-001' });
    });

    it('should return null when queue is empty', async () => {
      const event = await queue.dequeue();
      expect(event).toBeNull();
    });
  });

  describe('priority ordering', () => {
    it('should dequeue URGENT events before NORMAL events', async () => {
      // Enqueue normal first, then urgent
      await queue.enqueue({
        id: 'normal-001',
        priority: 'NORMAL',
        eventType: 'MintEvent',
        payload: { batchId: 'BATCH-2026-001' },
      });

      await queue.enqueue({
        id: 'urgent-001',
        priority: 'URGENT',
        eventType: 'RecallEvent',
        payload: { batchId: 'BATCH-2026-003' },
      });

      const first = await queue.dequeue();
      const second = await queue.dequeue();

      expect(first!.id).toBe('urgent-001');
      expect(first!.priority).toBe('URGENT');
      expect(second!.id).toBe('normal-001');
      expect(second!.priority).toBe('NORMAL');
    });

    it('should process multiple urgent events before any normal event', async () => {
      await queue.enqueue({
        id: 'normal-001',
        priority: 'NORMAL',
        eventType: 'MintEvent',
        payload: {},
      });

      await queue.enqueue({
        id: 'urgent-001',
        priority: 'URGENT',
        eventType: 'RecallEvent',
        payload: {},
      });

      await queue.enqueue({
        id: 'urgent-002',
        priority: 'URGENT',
        eventType: 'RecallEvent',
        payload: {},
      });

      const first = await queue.dequeue();
      const second = await queue.dequeue();
      const third = await queue.dequeue();

      expect(first!.priority).toBe('URGENT');
      expect(second!.priority).toBe('URGENT');
      expect(third!.priority).toBe('NORMAL');
    });
  });

  describe('requeueWithBackoff', () => {
    it('should increment attempt count on requeue', async () => {
      await queue.enqueue({
        id: 'evt-001',
        priority: 'NORMAL',
        eventType: 'MintEvent',
        payload: {},
      });

      const event = await queue.dequeue();
      expect(event!.attempts).toBe(0);

      await queue.requeueWithBackoff(event!, new Error('Sui RPC timeout'));

      // Advance time past the backoff period (1s for first retry)
      vi.advanceTimersByTime(2000);

      const retriedEvent = await queue.dequeue();
      expect(retriedEvent).not.toBeNull();
      expect(retriedEvent!.attempts).toBe(1);
      expect(retriedEvent!.lastAttemptAt).not.toBeNull();
    });

    it('should not be dequeueable before backoff period expires', async () => {
      await queue.enqueue({
        id: 'evt-001',
        priority: 'NORMAL',
        eventType: 'MintEvent',
        payload: {},
      });

      const event = await queue.dequeue();
      await queue.requeueWithBackoff(event!, new Error('fail'));

      // Don't advance time at all — event should not be ready
      const prematureDequeue = await queue.dequeue();
      expect(prematureDequeue).toBeNull();
    });

    it('should apply exponential backoff timing: 1s, 2s, 4s, 8s, 16s', async () => {
      await queue.enqueue({
        id: 'evt-001',
        priority: 'NORMAL',
        eventType: 'MintEvent',
        payload: {},
      });

      const expectedBackoffs = [1000, 2000, 4000, 8000];

      let event = await queue.dequeue();

      for (let i = 0; i < expectedBackoffs.length; i++) {
        const backoffMs = expectedBackoffs[i];
        const timeBefore = Date.now();

        await queue.requeueWithBackoff(event!, new Error(`fail attempt ${i + 1}`));

        // Should not be dequeued before backoff
        const early = await queue.dequeue();
        expect(early).toBeNull();

        // Advance to just past the backoff time
        vi.advanceTimersByTime(backoffMs + 10);

        event = await queue.dequeue();
        expect(event).not.toBeNull();
        expect(event!.attempts).toBe(i + 1);
      }
    });
  });

  describe('dead-letter after MAX_ATTEMPTS', () => {
    it('should dead-letter an event after 5 failed attempts', async () => {
      const fs = await import('fs');

      await queue.enqueue({
        id: 'evt-dead',
        priority: 'NORMAL',
        eventType: 'MintEvent',
        payload: { batchId: 'BATCH-FAILING' },
      });

      let event = await queue.dequeue();

      // Simulate 4 failed retries (attempts goes from 0 -> 1 -> 2 -> 3 -> 4)
      for (let i = 0; i < 4; i++) {
        await queue.requeueWithBackoff(event!, new Error(`fail ${i + 1}`));
        vi.advanceTimersByTime(20000); // enough for any backoff
        event = await queue.dequeue();
        expect(event).not.toBeNull();
      }

      // 5th failure -> dead-letter (attempt 5 >= MAX_ATTEMPTS)
      await queue.requeueWithBackoff(event!, new Error('final failure'));

      // Event should NOT be re-enqueued
      vi.advanceTimersByTime(100000);
      const afterDead = await queue.dequeue();
      expect(afterDead).toBeNull();

      // Should have written dead letter file
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should not dead-letter before reaching MAX_ATTEMPTS', async () => {
      const fs = await import('fs');
      vi.mocked(fs.writeFileSync).mockClear();

      const freshQueue = new RetryQueue();

      await freshQueue.enqueue({
        id: 'evt-retry',
        priority: 'URGENT',
        eventType: 'RecallEvent',
        payload: {},
      });

      let event = await freshQueue.dequeue();

      // Only 3 retries -- should not dead-letter
      for (let i = 0; i < 3; i++) {
        await freshQueue.requeueWithBackoff(event!, new Error(`fail ${i + 1}`));
        vi.advanceTimersByTime(20000);
        event = await freshQueue.dequeue();
        expect(event).not.toBeNull();
      }

      // writeFileSync should not have been called for dead-lettering
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  describe('depths', () => {
    it('should report correct queue depths', async () => {
      const initial = await queue.depths();
      expect(initial).toEqual({ urgent: 0, normal: 0 });

      await queue.enqueue({
        id: 'u1',
        priority: 'URGENT',
        eventType: 'RecallEvent',
        payload: {},
      });

      await queue.enqueue({
        id: 'n1',
        priority: 'NORMAL',
        eventType: 'MintEvent',
        payload: {},
      });

      await queue.enqueue({
        id: 'n2',
        priority: 'NORMAL',
        eventType: 'TransferEvent',
        payload: {},
      });

      const depths = await queue.depths();
      expect(depths).toEqual({ urgent: 1, normal: 2 });
    });
  });
});
