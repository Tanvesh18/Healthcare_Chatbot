const DEFAULT_WINDOW_MS = 15 * 60 * 1000;

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function clientKey(req) {
  if (req.auth?.id) return `user:${req.auth.id}`;
  return `ip:${req.ip || req.socket?.remoteAddress || "unknown"}`;
}

export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  max = 10,
  keyGenerator = clientKey,
  now = Date.now
} = {}) {
  const requests = new Map();

  return function rateLimit(req, res, next) {
    const timestamp = now();
    const key = keyGenerator(req);
    let entry = requests.get(key);

    if (!entry || timestamp >= entry.resetAt) {
      entry = { count: 0, resetAt: timestamp + windowMs };
      requests.set(key, entry);
    }

    entry.count += 1;
    const remaining = Math.max(0, max - entry.count);
    const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - timestamp) / 1000));

    res.setHeader("RateLimit-Limit", max);
    res.setHeader("RateLimit-Remaining", remaining);
    res.setHeader("RateLimit-Reset", retryAfterSeconds);

    if (entry.count > max) {
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again later.",
        retryAfterSeconds
      });
    }

    next();
  };
}

export function createConfiguredRateLimiter(prefix, defaults) {
  return createRateLimiter({
    windowMs: positiveInteger(process.env[`${prefix}_RATE_LIMIT_WINDOW_MS`], defaults.windowMs),
    max: positiveInteger(process.env[`${prefix}_RATE_LIMIT_MAX`], defaults.max)
  });
}

export const authRateLimiter = createConfiguredRateLimiter("AUTH", {
  windowMs: DEFAULT_WINDOW_MS,
  max: 20
});

export const aiRateLimiter = createConfiguredRateLimiter("AI", {
  windowMs: 60 * 1000,
  max: 10
});
