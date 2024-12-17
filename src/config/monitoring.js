const promClient = require('prom-client');
const responseTime = require('response-time');
const logger = require('./logger');

// Create a Registry to store metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// Create custom metrics
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const errorTotal = new promClient.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type']
});

// Register custom metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(httpRequestTotal);
register.registerMetric(errorTotal);

// Middleware to track response time
const responseTimeMiddleware = responseTime((req, res, time) => {
  const route = req.route ? req.route.path : req.path;
  const method = req.method;
  const statusCode = res.statusCode;

  httpRequestDurationMicroseconds
    .labels(method, route, statusCode)
    .observe(time / 1000); // Convert to seconds

  httpRequestTotal
    .labels(method, route, statusCode)
    .inc();

  // Log slow requests
  if (time > 1000) { // If request takes more than 1 second
    logger.warn(`Slow request: ${method} ${route} took ${time}ms`);
  }
});

// Error tracking middleware
const errorTrackingMiddleware = (err, req, res, next) => {
  errorTotal.labels(err.name || 'UnknownError').inc();
  next(err);
};

// Health check endpoints
const healthCheck = {
  liveness: async (req, res) => {
    try {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage()
      });
    } catch (error) {
      res.status(500).json({
        status: 'unhealthy',
        error: error.message
      });
    }
  },

  readiness: async (req, res) => {
    try {
      // Add checks for external services (database, cache, etc.)
      const checks = {
        database: await checkDatabaseConnection(),
        redis: await checkRedisConnection(),
        externalAPIs: await checkExternalAPIs()
      };

      const isHealthy = Object.values(checks).every(check => check.status === 'healthy');

      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ready' : 'not ready',
        timestamp: new Date().toISOString(),
        checks
      });
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  },

  metrics: async (req, res) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      res.status(500).json({
        status: 'error',
        error: error.message
      });
    }
  }
};

// Helper functions for health checks
async function checkDatabaseConnection() {
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 1) {
      return { status: 'healthy', message: 'Database connection is established' };
    }
    return { status: 'unhealthy', message: 'Database connection is not established' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

async function checkRedisConnection() {
  try {
    const redis = require('./rateLimit').redisClient;
    await redis.ping();
    return { status: 'healthy', message: 'Redis connection is established' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

async function checkExternalAPIs() {
  try {
    // Add checks for external APIs (payment gateway, email service, etc.)
    return { status: 'healthy', message: 'External APIs are accessible' };
  } catch (error) {
    return { status: 'unhealthy', message: error.message };
  }
}

module.exports = {
  register,
  responseTimeMiddleware,
  errorTrackingMiddleware,
  healthCheck
};
