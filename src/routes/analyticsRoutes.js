const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { query } = require('express-validator');
const AnalyticsController = require('../controllers/analyticsController');

// Validate date range
const validateDateRange = [
  query('startDate').optional().isISO8601().withMessage('Invalid start date'),
  query('endDate').optional().isISO8601().withMessage('Invalid end date')
];

// Event analytics
router.get('/events',
  authMiddleware,
  validateDateRange,
  AnalyticsController.getEventAnalytics
);

// Attendance analytics
router.get('/attendance',
  authMiddleware,
  validateDateRange,
  AnalyticsController.getAttendanceAnalytics
);

// Revenue analytics
router.get('/revenue',
  authMiddleware,
  validateDateRange,
  AnalyticsController.getRevenueAnalytics
);

// User engagement analytics
router.get('/engagement',
  authMiddleware,
  validateDateRange,
  AnalyticsController.getUserEngagementAnalytics
);

// Popular events analytics
router.get('/popular-events',
  authMiddleware,
  [
    ...validateDateRange,
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  AnalyticsController.getPopularEvents
);

// Category performance
router.get('/categories',
  authMiddleware,
  validateDateRange,
  AnalyticsController.getCategoryAnalytics
);

// Geographic distribution
router.get('/geographic',
  authMiddleware,
  validateDateRange,
  AnalyticsController.getGeographicDistribution
);

// User demographics
router.get('/demographics',
  authMiddleware,
  validateDateRange,
  AnalyticsController.getUserDemographics
);

// Conversion rates
router.get('/conversion',
  authMiddleware,
  validateDateRange,
  AnalyticsController.getConversionRates
);

// Export analytics data
router.get('/export',
  authMiddleware,
  [
    ...validateDateRange,
    query('format').isIn(['csv', 'xlsx', 'json']).withMessage('Invalid export format')
  ],
  AnalyticsController.exportAnalytics
);

// Real-time analytics
router.get('/realtime',
  authMiddleware,
  AnalyticsController.getRealTimeAnalytics
);

// Custom analytics query
router.post('/custom',
  authMiddleware,
  AnalyticsController.executeCustomAnalytics
);

module.exports = router;
