const WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 10_000;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Fixed-window rate limiter, in-memory per server instance. This does not
 * share state across serverless instances/regions, so it's a basic abuse
 * guard rather than a hard cap — fine for now, revisit (e.g. Redis-backed)
 * before relying on it under multi-instance production traffic.
 */
export function isRateLimited(key: string, limit: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    if (buckets.size >= MAX_TRACKED_KEYS) {
      for (const [trackedKey, trackedBucket] of buckets) {
        if (now >= trackedBucket.resetAt) buckets.delete(trackedKey);
      }
    }
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  bucket.count += 1;
  return bucket.count > limit;
}

/** Best-effort client identifier for rate limiting from a Route Handler's Request. */
export function getClientKey(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  return forwardedFor?.split(",")[0]?.trim() || "unknown";
}
