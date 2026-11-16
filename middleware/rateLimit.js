const rateLimit = require('express-rate-limit');

// General limiter for the whole site.
const siteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please slow down.' }
});

// Stricter limiter for API + auth endpoints.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'API rate limit exceeded.' }
});

module.exports = { siteLimiter, apiLimiter };
