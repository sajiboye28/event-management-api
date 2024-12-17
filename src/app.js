require('dotenv').config();
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const morgan = require('morgan');
const compression = require('compression');

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

// Security middleware
app.use(securityConfig.helmet);
app.use(securityConfig.cors);
app.use(securityConfig.xss);
app.use(securityConfig.mongoSanitize);
app.use(securityConfig.customSecurityHeaders);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());
app.use(morgan('combined', { stream: logger.stream }));
app.use(responseTimeMiddleware);

// Rate limiting
app.use(defaultLimit);
app.use('/api/', apiLimit);
app.use('/api/auth', authLimit);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Event Management API Documentation'
}));

// Health check endpoints
app.get('/health', healthCheck.liveness);
app.get('/ready', healthCheck.readiness);
app.get('/metrics', healthCheck.metrics);

// API Routes
app.use('/api/events', eventRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/recommendations', recommendationRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({
    name: 'Event Management API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health',
    ready: '/ready',
    metrics: '/metrics'
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn(`404 - Not Found - ${req.originalUrl}`);
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error tracking
app.use(errorTrackingMiddleware);

// Global error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    status: 'error',
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

module.exports = app;
