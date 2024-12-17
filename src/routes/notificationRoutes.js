const express = require('express');
const router = express.Router();
const NotificationService = require('../services/notificationService');
const { authenticateJWT } = require('../middleware/authMiddleware');
const errorHandler = require('../middleware/errorHandler');

const notificationService = new NotificationService();

/**
 * @route POST /notifications/event-reminder
 * @desc Send event reminder notifications
 * @access Private
 */
router.post('/event-reminder', 
  authenticateJWT, 
  errorHandler(async (req, res) => {
    const { eventId } = req.body;
    const result = await notificationService.sendEventReminders(eventId);
    res.json(result);
  }));

/**
 * @route POST /notifications/recommendations
 * @desc Send personalized event recommendations
 * @access Private
 */
router.post('/recommendations', 
  authenticateJWT, 
  errorHandler(async (req, res) => {
    const userId = req.user.id;
    const result = await notificationService.sendPersonalizedRecommendations(userId);
    res.json(result);
  }));

/**
 * @route POST /notifications/email
 * @desc Send custom email
 * @access Private
 */
router.post('/email', 
  authenticateJWT, 
  errorHandler(async (req, res) => {
    const { to, subject, body } = req.body;
    const result = await notificationService.sendEmail(to, subject, body);
    res.json({ messageId: result.messageId });
  }));

module.exports = router;
