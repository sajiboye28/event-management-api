const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const config = require('../config/config');

class PaymentService {
  constructor() {
    this.stripe = stripe;
    this.testConnection();
  }

  async testConnection() {
    try {
      const account = await this.stripe.account.retrieve();
      console.log('✅ Stripe Connection Successful');
      console.log('Account Details:', {
        id: account.id,
        type: account.type,
        country: account.country
      });
    } catch (error) {
      console.error('❌ Stripe Connection Failed:', error.message);
    }
  }

  async createPaymentIntent(amount, currency = 'usd') {
    try {
      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amount * 100, // Amount in cents
        currency: currency
      });

      return paymentIntent.client_secret;
    } catch (error) {
      console.error('Payment intent creation error:', error);
      throw error;
    }
  }

  async processEventPayment(eventId, userId, amount) {
    try {
      // Additional logic for event-specific payment processing
      // Could include checks for event capacity, ticket availability, etc.
      const payment = await this.createPaymentIntent(amount);
      
      // Log payment details
      console.log(`Payment processed for Event ${eventId} by User ${userId}`);

      return payment;
    } catch (error) {
      console.error('Event payment processing error:', error);
      throw error;
    }
  }

  async refundPayment(paymentIntentId) {
    try {
      const refund = await this.stripe.refunds.create({
        payment_intent: paymentIntentId
      });

      return refund;
    } catch (error) {
      console.error('Payment refund error:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();
