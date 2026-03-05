import { LRUCache } from 'lru-cache';

type RateLimitOptions = {
  uniqueTokenPerInterval?: number;
  interval?: number; // ms
  maxRequests: number;
};

export function rateLimit(options: RateLimitOptions) {
  const tokenCache = new LRUCache<string, number[]>({
    max: options.uniqueTokenPerInterval ?? 500,
    ttl: options.interval ?? 60_000,
  });

  return {
    check: (token: string): { success: boolean; remaining: number } => {
      const now = Date.now();
      const windowStart = now - (options.interval ?? 60_000);

      const tokenRequests = tokenCache.get(token) ?? [];
      const recentRequests = tokenRequests.filter((ts) => ts > windowStart);

      if (recentRequests.length >= options.maxRequests) {
        return { success: false, remaining: 0 };
      }

      recentRequests.push(now);
      tokenCache.set(token, recentRequests);

      return {
        success: true,
        remaining: options.maxRequests - recentRequests.length,
      };
    },
  };
}

// Pre-configured limiters
export const registerLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 min
  maxRequests: 5,
  uniqueTokenPerInterval: 500,
});

export const signInLimiter = rateLimit({
  interval: 15 * 60 * 1000, // 15 min
  maxRequests: 10,
  uniqueTokenPerInterval: 500,
});

export const tripCreateLimiter = rateLimit({
  interval: 60 * 1000, // 1 min
  maxRequests: 20,
  uniqueTokenPerInterval: 500,
});
