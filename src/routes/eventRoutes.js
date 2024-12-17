const express = require('express');
const router = express.Router();
const { 
  createEvent, 
  getAllEvents, 
  getEventById, 
  updateEvent, 
  deleteEvent,
  searchEvents,
  getEarlyBirdEvents,
  registerForEvent,
  getRecommendedEvents,
  getEventAnalytics,
  getRecentActivity
} = require('../controllers/eventController');
const authMiddleware = require('../middleware/authMiddleware');
const { body, param, query, validationResult } = require('express-validator');

// Validation middleware to handle express-validator errors
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));
    
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }
    
    return res.status(400).json({ 
      message: 'Validation Error', 
      errors: errors.array() 
    });
  };
};

// Sample events data (in-memory storage for now)
let events = [
  {
    id: 1,
    title: 'Tech Conference 2024',
    date: '2024-03-15',
    location: 'San Francisco, CA',
    description: 'Annual technology conference'
  },
  {
    id: 2,
    title: 'Music Festival',
    date: '2024-04-20',
    location: 'Los Angeles, CA',
    description: 'Summer music festival'
  }
];

/**
 * @swagger
 * /events:
 *   post:
 *     summary: Create a new event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       201:
 *         description: Event created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', 
  authMiddleware.verifyToken,
  validate([
    body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
    body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters'),
    body('date').isISO8601().toDate().withMessage('Invalid date format'),
    body('location.coordinates').isArray().withMessage('Coordinates must be an array')
  ]),
  createEvent
);

/**
 * @swagger
 * /events:
 *   get:
 *     summary: Get all events
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Number of events per page
 *     responses:
 *       200:
 *         description: List of events
 *       400:
 *         description: Bad request
 */
router.get('/', 
  validate([
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
  ]),
  getAllEvents
);

/**
 * @swagger
 * /events/search:
 *   get:
 *     summary: Advanced event search
 *     tags: [Events]
 *     parameters:
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Search by event title
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Start date for event search
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: End date for event search
 *     responses:
 *       200:
 *         description: Filtered events
 *       400:
 *         description: Invalid search parameters
 */
router.get('/search', 
  validate([
    query('startDate').optional().isISO8601().toDate().withMessage('Invalid start date'),
    query('endDate').optional().isISO8601().toDate().withMessage('Invalid end date')
  ]),
  searchEvents
);

/**
 * @swagger
 * /events/{id}:
 *   get:
 *     summary: Get event by ID
 *     tags: [Events]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event details
 *       404:
 *         description: Event not found
 */
router.get('/:id', 
  validate([
    param('id').isMongoId().withMessage('Invalid event ID')
  ]),
  getEventById
);

/**
 * @swagger
 * /events/{id}:
 *   put:
 *     summary: Update an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Event'
 *     responses:
 *       200:
 *         description: Event updated successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
router.put('/:id', 
  authMiddleware.verifyToken,
  validate([
    param('id').isMongoId().withMessage('Invalid event ID'),
    body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be 3-100 characters'),
    body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be 10-1000 characters')
  ]),
  updateEvent
);

/**
 * @swagger
 * /events/{id}:
 *   delete:
 *     summary: Delete an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Event deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Event not found
 */
router.delete('/:id', 
  authMiddleware.verifyToken,
  validate([
    param('id').isMongoId().withMessage('Invalid event ID')
  ]),
  deleteEvent
);

/**
 * @swagger
 * /events/{eventId}/register:
 *   post:
 *     summary: Register for an event
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: eventId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully registered for the event
 *       400:
 *         description: Registration failed
 *       401:
 *         description: Unauthorized
 */
router.post('/:eventId/register', 
  authMiddleware.verifyToken,
  validate([
    param('eventId').isMongoId().withMessage('Invalid event ID')
  ]),
  registerForEvent
);

/**
 * @swagger
 * /events/early-bird:
 *   get:
 *     summary: Get events with early bird discounts
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: List of events with early bird discounts
 */
router.get('/early-bird', getEarlyBirdEvents);

/**
 * @swagger
 * /events/recent-activity:
 *   get:
 *     summary: Get recent event activity
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: Recent event activity
 *       500:
 *         description: Internal server error
 */
router.get('/recent-activity', async (req, res) => {
  try {
    const result = await getRecentActivity(req, res);
    return result;
  } catch (error) {
    console.error('Error in recent-activity route:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * @swagger
 * /api/events/recent-activity:
 *   get:
 *     summary: Get recent event activity
 *     tags: [Events]
 *     responses:
 *       200:
 *         description: Recent event activity
 */
router.get('/api/events/recent-activity', getRecentActivity);

/**
 * @swagger
 * /events/recommended:
 *   get:
 *     summary: Get personalized event recommendations
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of recommended events
 *       401:
 *         description: Unauthorized
 */
router.get('/recommended', 
  authMiddleware.verifyToken, 
  getRecommendedEvents
);

/**
 * @swagger
 * /events/analytics:
 *   get:
 *     summary: Get comprehensive event analytics
 *     tags: [Events]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event analytics
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/analytics', 
  authMiddleware.verifyToken, 
  authMiddleware.requireRole([authMiddleware.ROLES.ADMIN]), 
  getEventAnalytics
);

// Get all events
router.get('/crud', (req, res) => {
  res.json(events);
});

// Get event by ID
router.get('/crud/:id', (req, res) => {
  const event = events.find(e => e.id === parseInt(req.params.id));
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
  res.json(event);
});

// Create new event
router.post('/crud', (req, res) => {
  const newEvent = {
    id: events.length + 1,
    title: req.body.title,
    date: req.body.date,
    location: req.body.location,
    description: req.body.description
  };
  events.push(newEvent);
  res.status(201).json(newEvent);
});

// Update event
router.put('/crud/:id', (req, res) => {
  const event = events.find(e => e.id === parseInt(req.params.id));
  if (!event) {
    return res.status(404).json({ message: 'Event not found' });
  }
    
  event.title = req.body.title || event.title;
  event.date = req.body.date || event.date;
  event.location = req.body.location || event.location;
  event.description = req.body.description || event.description;
    
  res.json(event);
});

// Delete event
router.delete('/crud/:id', (req, res) => {
  const eventIndex = events.findIndex(e => e.id === parseInt(req.params.id));
  if (eventIndex === -1) {
    return res.status(404).json({ message: 'Event not found' });
  }
    
  events.splice(eventIndex, 1);
  res.json({ message: 'Event deleted successfully' });
});

module.exports = router;
