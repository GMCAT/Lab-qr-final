export function createRateLimiter({ limit, windowMs, name }) {
  const buckets = new Map();
  const cleanup = setInterval(() => { const now = Date.now(); for (const [key, bucket] of buckets) if (bucket.resetAt <= now) buckets.delete(key); }, Math.min(windowMs, 60000));
  cleanup.unref();
  return (req, res, next) => {
    const now = Date.now(); const key = `${name}:${req.ip}`; let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) { bucket = { count: 0, resetAt: now + windowMs }; buckets.set(key, bucket); }
    bucket.count += 1; const remaining = Math.max(0, limit - bucket.count); const resetSeconds = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    res.setHeader('RateLimit-Limit', limit); res.setHeader('RateLimit-Remaining', remaining); res.setHeader('RateLimit-Reset', resetSeconds);
    if (bucket.count > limit) { res.setHeader('Retry-After', resetSeconds); return res.status(429).json({ error: 'ส่งคำขอถี่เกินไป กรุณาลองใหม่ภายหลัง', request_id: req.id }); }
    next();
  };
}
