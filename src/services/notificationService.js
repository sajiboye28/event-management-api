const nodemailer = require('nodemailer');
const twilio = require('twilio');
const Event = require('../models/Event');
const User = require('../models/User');
const Notification = require('../models/Notification');

class NotificationService {
  constructor() {
    // Email transporter
    this.emailTransporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.mailtrap.io',
      port: process.env.EMAIL_PORT || 2525,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER || 'default_user',
        pass: process.env.EMAIL_PASS || 'default_pass'
      }
    });

    // SMS transporter (Twilio)
    this.smsClient = twilio(
      process.env.TWILIO_ACCOUNT_SID, 
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  /**
   * Send email notification
   * @param {String} to - Recipient email
   * @param {String} subject - Email subject
   * @param {String} body - Email body
   * @returns {Promise<Object>} Sending result
   */
  async sendEmail(to, subject, body) {
    try {
      return await this.emailTransporter.sendMail({
        from: process.env.EMAIL_FROM || 'events@yourdomain.com',
        to,
        subject,
        html: body
      });
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  }

  /**
   * Send SMS notification
   * @param {String} to - Recipient phone number
   * @param {String} message - SMS message
   * @returns {Promise<Object>} Sending result
   */
  async sendSMS(to, message) {
    try {
      return await this.smsClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to
      });
    } catch (error) {
      console.error('SMS sending error:', error);
      throw new Error('Failed to send SMS');
    }
  }

  /**
   * Send event reminder notifications
   * @param {String} eventId - Event to send reminders for
   * @returns {Promise<Object>} Notification summary
   */
  async sendEventReminders(eventId) {
    try {
      const event = await Event.findById(eventId).populate('participants');
      
      if (!event) {
        throw new Error('Event not found');
      }

      const reminderTasks = event.participants.map(async (participant) => {
        const emailPromise = this.sendEmail(
          participant.email, 
          `Reminder: ${event.title}`,
          this.generateReminderEmail(event)
        );

        const smsPromise = participant.phoneNumber 
          ? this.sendSMS(
            participant.phoneNumber, 
            `Reminder: ${event.title} is coming up on ${event.date.toLocaleDateString()}`
          )
          : Promise.resolve();

        return Promise.all([emailPromise, smsPromise]);
      });

      await Promise.allSettled(reminderTasks);

      return {
        totalParticipants: event.participants.length,
        eventTitle: event.title
      };
    } catch (error) {
      console.error('Event reminder error:', error);
      throw new Error('Failed to send event reminders');
    }
  }

  /**
   * Create personalized event recommendation notifications
   * @param {String} userId - User to send recommendations to
   * @returns {Promise<Object>} Recommendation notification result
   */
  async sendPersonalizedRecommendations(userId) {
    try {
      const user = await User.findById(userId);
      const recommendations = await RecommendationService.generatePersonalizedRecommendations(userId);

      if (recommendations.length === 0) {
        return { status: 'No recommendations available' };
      }

      const emailBody = this.createRecommendationTemplate(recommendations);

      await this.sendEmail(
        user.email, 
        'Personalized Event Recommendations', 
        emailBody
      );

      return {
        recommendationCount: recommendations.length,
        userEmail: user.email
      };
    } catch (error) {
      console.error('Recommendation notification error:', error);
      throw new Error('Failed to send personalized recommendations');
    }
  }

  /**
   * Create event reminder email template
   * @param {Object} event - Event details
   * @returns {String} HTML email template
   */
  generateReminderEmail(event) {
    return `
      <h2>Event Reminder</h2>
      <h3>${event.title}</h3>
      <p>This is a reminder about your upcoming event:</p>
      <ul>
        <li>Date: ${new Date(event.date).toLocaleDateString()}</li>
        <li>Time: ${new Date(event.date).toLocaleTimeString()}</li>
        <li>Location: ${event.location.address.street}, ${event.location.address.city}</li>
      </ul>
      <p>We look forward to seeing you there!</p>
    `;
  }

  /**
   * Create event recommendation email template
   * @param {Array} recommendations - Recommended events
   * @returns {String} HTML email template
   */
  createRecommendationTemplate(recommendations) {
    const recommendationItems = recommendations.map(event => `
      <li>
        <strong>${event.title}</strong>
        <p>Date: ${event.date.toLocaleDateString()}</p>
        <p>Location: ${event.location.city}</p>
      </li>
    `).join('');

    return `
      <html>
        <body>
          <h1>Personalized Event Recommendations</h1>
          <ul>${recommendationItems}</ul>
        </body>
      </html>
    `;
  }

  async sendEventUpdate(users, event, changes) {
    try {
      const notifications = [];
      for (const user of users) {
        const notification = new Notification({
          userId: user._id,
          eventId: event._id,
          type: 'update',
          title: `Event Update: ${event.title}`,
          message: this.generateUpdateMessage(changes),
          status: 'pending'
        });

        await this.sendEmail(
          user.email, 
          `Event Update: ${event.title}`,
          this.generateUpdateEmail(event, changes)
        );

        notification.status = 'sent';
        await notification.save();
        notifications.push(notification);
      }
      return notifications;
    } catch (error) {
      console.error('Error sending update:', error);
      throw error;
    }
  }

  async sendRegistrationConfirmation(user, event, ticket) {
    try {
      const notification = new Notification({
        userId: user._id,
        eventId: event._id,
        type: 'registration',
        title: 'Registration Confirmed',
        message: `Your registration for ${event.title} has been confirmed`,
        status: 'pending'
      });

      await this.sendEmail(
        user.email, 
        `Registration Confirmed: ${event.title}`,
        this.generateRegistrationEmail(event, ticket)
      );

      notification.status = 'sent';
      await notification.save();
      return notification;
    } catch (error) {
      console.error('Error sending confirmation:', error);
      throw error;
    }
  }

  generateUpdateEmail(event, changes) {
    return `
      <h2>Event Update</h2>
      <h3>${event.title}</h3>
      <p>The following changes have been made to the event:</p>
      <ul>
        ${Object.entries(changes).map(([key, value]) => `
          <li>${key}: ${value}</li>
        `).join('')}
      </ul>
      <p>If you have any questions, please contact us.</p>
    `;
  }

  generateRegistrationEmail(event, ticket) {
    return `
      <h2>Registration Confirmed</h2>
      <h3>${event.title}</h3>
      <p>Your registration has been confirmed. Here are your ticket details:</p>
      <ul>
        <li>Ticket ID: ${ticket._id}</li>
        <li>Event Date: ${new Date(event.date).toLocaleDateString()}</li>
        <li>Location: ${event.location.address.street}, ${event.location.address.city}</li>
      </ul>
      <p>Please keep this email for your records.</p>
    `;
  }

  generateUpdateMessage(changes) {
    return Object.entries(changes)
      .map(([key, value]) => `${key} has been updated to ${value}`)
      .join('. ');
  }
}

module.exports = new NotificationService();
