import { Request, Response, NextFunction } from 'express';

interface RateLimitOptions {
  windowMs: number;
  max: number;
  message?: string;
}

interface BucketEntry {
  count: number;
  resetAt: number;
}

/**
 * In-process sliding-window rate limiter. For production, replace the
 * in-memory store with a Redis-backed implementation (e.g. rate-limiter-flexible).
 */
function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, max, message = 'Too many requests. Please try again later.' } = options;
  const store = new Map<string, BucketEntry>();

  // Cleanup expired entries every minute to avoid memory growth
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store) {
      if (entry.resetAt <= now) store.delete(key);
    }
  }, 60_000);

  return (req: Request, res: Response, next: NextFunction): void => {
    // Key by IP; fall back to a single shared key behind proxies with no forwarded header
    const ip =
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0].trim() ??
      req.socket.remoteAddress ??
      'unknown';

    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || entry.resetAt <= now) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    entry.count += 1;

    const remaining = Math.max(0, max - entry.count);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

/** Standard API rate limit: 120 req / min per IP */
export const apiRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 120,
});

/** Strict limit for auth endpoints: 10 req / 15 min per IP */
export const authRateLimit = createRateLimiter({
  windowMs: 15 * 60_000,
  max: 10,
  message: 'Too many login attempts. Please wait 15 minutes.',
});

/** Public verify endpoint: 300 req / min (patients scanning barcodes) */
export const verifyRateLimit = createRateLimiter({
  windowMs: 60_000,
  max: 300,
});
