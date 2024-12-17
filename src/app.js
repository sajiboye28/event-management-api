require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const morgan = require('morgan');
const compression = require('compression');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');

// Import configurations
const swaggerSpec = require('./config/swagger');
const { defaultLimit, apiLimit, authLimit } = require('./config/rateLimit');
const logger = require('./config/logger');
const securityConfig = require('./config/security');
const { responseTimeMiddleware, errorTrackingMiddleware, healthCheck } = require('./config/monitoring');

// Import routes
const eventRoutes = require('./routes/eventRoutes');
const authRoutes = require('./routes/authRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(securityConfig.helmet);
app.use(securityConfig.cors);
app.use(securityConfig.xss);
app.use(securityConfig.mongoSanitize);
app.use(securityConfig.customSecurityHeaders);
app.use(hpp());  // Prevent HTTP Parameter Pollution
app.use(cookieParser());  // Required for secure cookie handling

// Basic middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();  // Required for webhook signature verification
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: logger.stream }));
app.use(responseTimeMiddleware);
app.use(errorTrackingMiddleware);

// Global rate limiting
app.use(defaultLimit);
app.use('/api/', apiLimit);
app.use('/api/auth', authLimit);

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// API Documentation with authentication
app.use('/api-docs', 
  (req, res, next) => {
    if (process.env.NODE_ENV === 'production') {
      const auth = {login: process.env.SWAGGER_USER, password: process.env.SWAGGER_PASSWORD};
      const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
      const [login, password] = Buffer.from(b64auth, 'base64').toString().split(':');
      if (!login || !password || login !== auth.login || password !== auth.password) {
        res.set('WWW-Authenticate', 'Basic realm="Swagger Documentation"');
        return res.status(401).send('Authentication required.');
      }
    }
    return next();
  },
  swaggerUi.serve, 
  swaggerUi.setup(swaggerSpec, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Event Management API Documentation'
  })
);

// Health check endpoints
app.get('/health', healthCheck.liveness);
app.get('/health/readiness', healthCheck.readiness);

// API routes
app.use('/api/v1/events', eventRoutes);
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/recommendations', recommendationRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  
  // Log security related errors differently
  if (err.name === 'UnauthorizedError' || err.status === 401 || err.status === 403) {
    logger.warn({
      type: 'security_violation',
      ip: req.ip,
      path: req.path,
      headers: req.headers
    });
  }

  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn({
    type: '404_not_found',
    ip: req.ip,
    path: req.path,
    method: req.method
  });
  
  res.status(404).json({
    status: 'error',
    message: 'Resource not found'
  });
});

module.exports = app;
