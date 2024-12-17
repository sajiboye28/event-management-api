const nodemailer = require('nodemailer');
const config = require('../config/config');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.EMAIL_SERVICE.HOST,
      port: config.EMAIL_SERVICE.PORT,
      auth: {
        user: config.EMAIL_SERVICE.USER,
        pass: config.EMAIL_SERVICE.PASS
      }
    });
    this.testConnection();
  }

  async testConnection() {
    try {
      await this.transporter.verify();
      console.log('✅ Email Service Connection Successful');
    } catch (error) {
      console.error('❌ Email Service Connection Failed:', error.message);
    }
  }

  async sendEventInvitation(to, eventDetails) {
    try {
      const mailOptions = {
        from: '"Event Management" <noreply@eventmanagement.com>',
        to: to,
        subject: `Invitation: ${eventDetails.title}`,
        html: `
          <h1>Event Invitation</h1>
          <p>You are invited to ${eventDetails.title}</p>
          <p>Date: ${new Date(eventDetails.date).toLocaleString()}</p>
          <p>Location: ${eventDetails.location.address}</p>
          <p>Description: ${eventDetails.description}</p>
        `
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }

  async sendEventReminder(to, eventDetails) {
    try {
      const mailOptions = {
        from: '"Event Management" <noreply@eventmanagement.com>',
        to: to,
        subject: `Reminder: ${eventDetails.title}`,
        html: `
          <h1>Event Reminder</h1>
          <p>Reminder for upcoming event: ${eventDetails.title}</p>
          <p>Date: ${new Date(eventDetails.date).toLocaleString()}</p>
          <p>Location: ${eventDetails.location.address}</p>
        `
      };

      return await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Error sending reminder email:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
