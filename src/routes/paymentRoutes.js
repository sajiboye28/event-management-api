const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { body, param } = require('express-validator');
const PaymentController = require('../controllers/paymentController');

// Validation middleware
const validatePayment = [
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('currency').isIn(['USD', 'EUR', 'GBP']).withMessage('Invalid currency'),
  body('paymentMethod').isIn(['credit_card', 'paypal', 'stripe']).withMessage('Invalid payment method')
];

// Create payment intent
router.post('/create-intent',
  authMiddleware,
  validatePayment,
  PaymentController.createPaymentIntent
);

// Process payment
router.post('/process',
  authMiddleware,
  [
    ...validatePayment,
    body('paymentIntentId').notEmpty().withMessage('Payment intent ID is required')
  ],
  PaymentController.processPayment
);

// Get payment status
router.get('/status/:paymentId',
  authMiddleware,
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  PaymentController.getPaymentStatus
);

// Get user's payment history
router.get('/history',
  authMiddleware,
  PaymentController.getPaymentHistory
);

// Request refund
router.post('/refund/:paymentId',
  authMiddleware,
  [
    param('paymentId').notEmpty().withMessage('Payment ID is required'),
    body('reason').notEmpty().withMessage('Refund reason is required')
  ],
  PaymentController.requestRefund
);

// Generate invoice
router.get('/invoice/:paymentId',
  authMiddleware,
  param('paymentId').notEmpty().withMessage('Payment ID is required'),
  PaymentController.generateInvoice
);

// Payment webhooks (no auth required for external service callbacks)
router.post('/webhook/stripe', PaymentController.handleStripeWebhook);
router.post('/webhook/paypal', PaymentController.handlePaypalWebhook);

module.exports = router;
