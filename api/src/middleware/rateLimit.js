const { rateLimitWindowMs, rateLimitMaxRequests } = require('../helpers/configuration');

// Simple in-memory limiter per IP. Enough for one API container;
// with several containers this would move to a shared store.
const requests = new Map();

module.exports = function rateLimit(req, res, next) {
    const key = req.ip;
    const now = Date.now();

    const current = requests.get(key) || { count: 0, resetAt: now + rateLimitWindowMs };

    if (now > current.resetAt) {
        current.count = 0;
        current.resetAt = now + rateLimitWindowMs;
    }

    current.count += 1;
    requests.set(key, current);

    if (current.count > rateLimitMaxRequests) {
        return res.status(429).json({ message: 'Too many requests. Please try again later.' });
    }

    return next();
};
