import { getRedisClient } from '../config/redis';
import { env } from '../config/env';

/**
 * Build a Redis key for the sender's hourly window.
 * Format: rate:{senderEmail}:{YYYY-MM-DD-HH}
 */
function buildRateKey(senderEmail: string, date: Date): string {
  const year  = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day   = String(date.getUTCDate()).padStart(2, '0');
  const hour  = String(date.getUTCHours()).padStart(2, '0');
  return `rate:${senderEmail}:${year}-${month}-${day}-${hour}`;
}

/**
 * Get the Unix timestamp for the end of the current UTC hour.
 */
function endOfHourUnix(date: Date): number {
  const end = new Date(date);
  end.setUTCMinutes(59, 59, 999);
  return Math.floor(end.getTime() / 1000);
}

/**
 * Get the start of the NEXT UTC hour.
 */
export function nextHourStart(date: Date): Date {
  const next = new Date(date);
  next.setUTCHours(next.getUTCHours() + 1, 0, 0, 0);
  return next;
}

/**
 * Check rate limit and increment counter atomically.
 * Returns { allowed: true } if under limit, or { allowed: false, resetAt: Date } if over.
 *
 * Uses Redis INCR + EXPIREAT — safe across multiple workers/instances.
 */
export async function checkAndIncrementRateLimit(
  senderEmail: string,
  limit?: number
): Promise<{ allowed: boolean; count: number; resetAt?: Date }> {
  const redis = getRedisClient();
  const now = new Date();
  const key = buildRateKey(senderEmail, now);
  const effectiveLimit = limit ?? env.rateLimit.maxPerHourPerSender;

  // Lua script to atomically INCR + set expiry only if key is new
  const luaScript = `
    local current = redis.call('INCR', KEYS[1])
    if current == 1 then
      redis.call('EXPIREAT', KEYS[1], ARGV[1])
    end
    return current
  `;

  const expireAt = endOfHourUnix(now);
  const count = (await redis.eval(luaScript, 1, key, String(expireAt))) as number;

  if (count > effectiveLimit) {
    const resetAt = nextHourStart(now);
    return { allowed: false, count, resetAt };
  }

  return { allowed: true, count };
}

/**
 * Get the current count for a sender in the current hour (read-only, no increment).
 */
export async function getRateLimitCount(senderEmail: string): Promise<number> {
  const redis = getRedisClient();
  const key = buildRateKey(senderEmail, new Date());
  const val = await redis.get(key);
  return val ? parseInt(val, 10) : 0;
}
