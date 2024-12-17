const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');

// Create Redis client
const redisClient = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  enableOfflineQueue: false
});

// Default rate limit configuration
const defaultLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again after 15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// API-specific rate limit
const apiLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute
  message: {
    error: 'Too many API requests from this IP, please try again after a minute'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Strict rate limit for sensitive operations
const strictLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // limit each IP to 5 requests per hour
  message: {
    error: 'Too many attempts for sensitive operations, please try again after an hour'
  },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = {
  defaultLimit,
  apiLimit,
  strictLimit,
  redisClient
};
