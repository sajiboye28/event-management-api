const crypto = require('crypto');
const Event = require('../models/Event');
const User = require('../models/User');
const AuditLogService = require('./auditLogService');

class EventSecurityService {
  // Generate secure event access token
  static generateEventAccessToken(eventId, userId) {
    const payload = {
      eventId,
      userId,
      timestamp: Date.now()
    };

    // Create a secure hash
    const token = crypto.createHash('sha256')
      .update(JSON.stringify(payload) + process.env.EVENT_TOKEN_SECRET)
      .digest('hex');

    return {
      accessToken: token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    };
  }

  // Validate event access token
  static validateEventAccessToken(token, eventId, userId) {
    const payload = {
      eventId,
      userId,
      timestamp: Date.now()
    };

    const expectedToken = crypto.createHash('sha256')
      .update(JSON.stringify(payload) + process.env.EVENT_TOKEN_SECRET)
      .digest('hex');

    return token === expectedToken;
  }

  // Detect suspicious event registration patterns
  static async detectSuspiciousRegistrations(eventId) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    try {
      // Find registrations within last 24 hours
      const registrations = await Event.aggregate([
        { $match: { _id: mongoose.Types.ObjectId(eventId) } },
        { $unwind: '$participants' },
        {
          $lookup: {
            from: 'users',
            localField: 'participants',
            foreignField: '_id',
            as: 'participantDetails'
          }
        },
        { $unwind: '$participantDetails' },
        {
          $group: {
            _id: '$participantDetails.contactInfo.ipAddress',
            registrationCount: { $sum: 1 },
            users: { $addToSet: '$participantDetails._id' }
          }
        },
        { $match: { registrationCount: { $gt: 5 } } } // More than 5 registrations from same IP
      ]);

      return {
        suspiciousRegistrations: registrations,
        potentialFraud: registrations.length > 0
      };
    } catch (error) {
      console.error('Suspicious registration detection error:', error);
      throw error;
    }
  }

  // Implement event registration rate limiting
  static async checkRegistrationRateLimit(userId, eventId) {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    try {
      const recentRegistrations = await Event.countDocuments({
        participants: userId,
        createdAt: { $gte: twentyFourHoursAgo }
      });

      // Limit to 10 event registrations per 24 hours
      if (recentRegistrations >= 10) {
        await AuditLogService.log({
          userId,
          action: 'REGISTRATION_RATE_LIMIT_EXCEEDED',
          details: {
            eventId,
            registrationCount: recentRegistrations
          },
          success: false
        });

        return {
          allowed: false,
          message: 'Registration limit exceeded. Please try again later.'
        };
      }

      return { allowed: true };
    } catch (error) {
      console.error('Registration rate limit check error:', error);
      throw error;
    }
  }

  // Advanced event registration risk assessment
  static async assessRegistrationRisk(userId, eventId) {
    try {
      const user = await User.findById(userId);
      const event = await Event.findById(eventId);

      // Risk scoring mechanism
      let riskScore = 0;

      // Account age factor
      const accountAgeInDays = (Date.now() - user.createdAt) / (1000 * 3600 * 24);
      if (accountAgeInDays < 30) riskScore += 2;

      // Previous event participation
      const pastEventCount = user.registeredEvents.length;
      if (pastEventCount < 3) riskScore += 1;

      // Event capacity and current registrations
      const registrationPercentage = event.participants.length / event.capacity;
      if (registrationPercentage > 0.9) riskScore += 1;

      // Location-based risk (if implemented)
      // You could add geolocation-based risk assessment here

      // Determine risk level
      let riskLevel = 'LOW';
      if (riskScore > 3) riskLevel = 'HIGH';
      else if (riskScore > 1) riskLevel = 'MEDIUM';

      // Log risk assessment
      await AuditLogService.log({
        userId,
        action: 'REGISTRATION_RISK_ASSESSMENT',
        details: {
          eventId,
          riskScore,
          riskLevel
        }
      });

      return {
        riskLevel,
        riskScore,
        requiresAdditionalVerification: riskLevel !== 'LOW'
      };
    } catch (error) {
      console.error('Registration risk assessment error:', error);
      throw error;
    }
  }

  // Comprehensive event security check
  static async performEventSecurityCheck(userId, eventId) {
    try {
      // Multiple security checks
      const [rateLimit, riskAssessment, suspiciousRegistrations] = await Promise.all([
        this.checkRegistrationRateLimit(userId, eventId),
        this.assessRegistrationRisk(userId, eventId),
        this.detectSuspiciousRegistrations(eventId)
      ]);

      return {
        allowed: rateLimit.allowed && !suspiciousRegistrations.potentialFraud,
        rateLimit,
        riskAssessment,
        suspiciousRegistrations
      };
    } catch (error) {
      console.error('Comprehensive event security check error:', error);
      throw error;
    }
  }
}

module.exports = EventSecurityService;
