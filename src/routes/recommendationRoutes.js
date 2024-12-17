const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { query, body } = require('express-validator');
const RecommendationController = require('../controllers/recommendationController');

// Get personalized event recommendations
router.get('/events',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
    query('category').optional().isString().withMessage('Invalid category'),
    query('location').optional().isString().withMessage('Invalid location')
  ],
  RecommendationController.getPersonalizedRecommendations
);

// Get similar events
router.get('/similar/:eventId',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20')
  ],
  RecommendationController.getSimilarEvents
);

// Get trending events
router.get('/trending',
  authMiddleware,
  [
    query('timeframe').optional().isIn(['day', 'week', 'month']).withMessage('Invalid timeframe'),
    query('category').optional().isString().withMessage('Invalid category'),
    query('location').optional().isString().withMessage('Invalid location')
  ],
  RecommendationController.getTrendingEvents
);

// Get recommended categories
router.get('/categories',
  authMiddleware,
  RecommendationController.getRecommendedCategories
);

// Get location-based recommendations
router.get('/nearby',
  authMiddleware,
  [
    query('latitude').isFloat().withMessage('Invalid latitude'),
    query('longitude').isFloat().withMessage('Invalid longitude'),
    query('radius').optional().isFloat({ min: 0 }).withMessage('Invalid radius'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  RecommendationController.getNearbyEvents
);

// Get recommendations based on user's past attendance
router.get('/based-on-history',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  RecommendationController.getRecommendationsBasedOnHistory
);

// Get collaborative filtering recommendations
router.get('/collaborative',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  RecommendationController.getCollaborativeRecommendations
);

// Get content-based recommendations
router.get('/content-based',
  authMiddleware,
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  RecommendationController.getContentBasedRecommendations
);

// Get time-sensitive recommendations (upcoming events)
router.get('/upcoming',
  authMiddleware,
  [
    query('days').optional().isInt({ min: 1, max: 90 }).withMessage('Days must be between 1 and 90'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50')
  ],
  RecommendationController.getUpcomingRecommendations
);

// Update user preferences
router.post('/preferences',
  authMiddleware,
  [
    body('categories').optional().isArray().withMessage('Categories must be an array'),
    body('locations').optional().isArray().withMessage('Locations must be an array'),
    body('priceRange').optional().isObject().withMessage('Price range must be an object'),
    body('notifications').optional().isBoolean().withMessage('Notifications must be boolean')
  ],
  RecommendationController.updateUserPreferences
);

module.exports = router;
