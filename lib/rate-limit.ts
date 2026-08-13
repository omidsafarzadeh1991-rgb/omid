/**
 * Abuse-protection abstraction for public endpoints (spec §21).
 *
 * `RateLimiter` is the contract every backend must satisfy. `MemoryRateLimiter`
 * is the only backend wired up today — it is a fixed-window counter that lives
 * in the Node.js process memory.
 *
 * Honest limitation: on a multi-instance / serverless deployment (e.g. Vercel
 * with multiple lambdas) each instance keeps its own counters, so this does
 * NOT provide a hard, cluster-wide guarantee — only a best-effort deterrent
 * against casual abuse from a single request source. Swapping in a real
 * distributed limiter (Upstash Redis, etc.) only requires implementing this
 * same `RateLimiter` interface and changing where it's instantiated below;
 * nothing in the API route needs to change.
 */

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

interface WindowEntry {
  count: number;
  windowStart: number;
}

class MemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, WindowEntry>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): RateLimitResult {
    const now = Date.now();
    const entry = this.hits.get(key);

    if (!entry || now - entry.windowStart >= this.windowMs) {
      this.hits.set(key, { count: 1, windowStart: now });
      this.pruneOccasionally(now);
      return { success: true, remaining: this.limit - 1, resetAt: now + this.windowMs };
    }

    entry.count += 1;
    const resetAt = entry.windowStart + this.windowMs;
    if (entry.count > this.limit) {
      return { success: false, remaining: 0, resetAt };
    }
    return { success: true, remaining: this.limit - entry.count, resetAt };
  }

  /** Cheap opportunistic cleanup so the map doesn't grow unbounded. */
  private pruneOccasionally(now: number) {
    if (Math.random() > 0.01) return;
    for (const [key, entry] of this.hits) {
      if (now - entry.windowStart >= this.windowMs) this.hits.delete(key);
    }
  }
}

/** Per-IP: 5 booking attempts per 10 minutes. */
export const appointmentIpLimiter: RateLimiter = new MemoryRateLimiter(5, 10 * 60 * 1000);

/** Per-phone-number: 3 booking attempts per hour. */
export const appointmentPhoneLimiter: RateLimiter = new MemoryRateLimiter(3, 60 * 60 * 1000);
