// Simple in-memory rate limiter for API routes
// For production, consider using Redis or a more robust solution

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 10 * 60 * 1000);

export function rateLimit(
  identifier: string,
  limit: number = 10,
  windowMs: number = 60 * 1000 // 1 minute default
): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const resetTime = now + windowMs;
  
  const existing = rateLimitMap.get(identifier);
  
  if (!existing || now > existing.resetTime) {
    // First request or window expired
    rateLimitMap.set(identifier, { count: 1, resetTime });
    return { success: true, remaining: limit - 1, resetTime };
  }
  
  if (existing.count >= limit) {
    // Rate limit exceeded
    return { success: false, remaining: 0, resetTime: existing.resetTime };
  }
  
  // Increment count
  existing.count++;
  return { success: true, remaining: limit - existing.count, resetTime: existing.resetTime };
}

export function getRateLimitHeaders(remaining: number, resetTime: number) {
  return {
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(resetTime / 1000).toString(),
  };
}
