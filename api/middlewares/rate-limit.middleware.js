function createRateLimitMiddleware(config) {
  const buckets = new Map();

  return function rateLimitMiddleware(req, res, next) {
    if (req.method === "GET" || req.method === "HEAD") {
      next();
      return;
    }

    const now = Date.now();
    const windowMs = config.security.rateLimitWindowMs;
    const max = config.security.rateLimitMax;
    const key = `${req.ip}:${req.path}`;

    for (const [bucketKey, bucketValue] of buckets.entries()) {
      if (now > bucketValue.resetAt) {
        buckets.delete(bucketKey);
      }
    }

    const current = buckets.get(key) || {
      count: 0,
      resetAt: now + windowMs
    };

    if (now > current.resetAt) {
      current.count = 0;
      current.resetAt = now + windowMs;
    }

    current.count += 1;
    buckets.set(key, current);

    if (current.count > max) {
      res.status(429).json({
        ok: false,
        error: "rate_limit_exceeded"
      });
      return;
    }

    next();
  };
}

module.exports = {
  createRateLimitMiddleware
};
