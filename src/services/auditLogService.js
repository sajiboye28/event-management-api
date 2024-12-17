const mongoose = require('mongoose');

// Audit Log Schema
const AuditLogSchema = new mongoose.Schema({
  user: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: String,
    email: String,
    role: String
  },
  action: {
    type: String,
    required: true,
    enum: [
      // Authentication Actions
      'LOGIN_ATTEMPT',
      'LOGIN_SUCCESS',
      'LOGIN_FAILURE',
      'LOGOUT',
      'PASSWORD_CHANGE',
      'PASSWORD_RESET',
      
      // User Management
      'USER_REGISTRATION',
      'USER_PROFILE_UPDATE',
      'USER_ROLE_CHANGE',
      
      // Two-Factor Authentication
      '2FA_ENABLE',
      '2FA_DISABLE',
      '2FA_VERIFY',
      
      // OAuth
      'OAUTH_LOGIN',
      
      // Event Actions
      'EVENT_CREATE',
      'EVENT_UPDATE',
      'EVENT_DELETE',
      'EVENT_REGISTRATION',
      'EVENT_CANCELLATION',
      
      // System Actions
      'API_ACCESS',
      'PERMISSION_DENIED',
      'SYSTEM_ERROR'
    ]
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: String,
  userAgent: String,
  success: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  collection: 'audit_logs'
});

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);

class AuditLogService {
  // Log an audit event
  static async log(options) {
    try {
      const {
        userId,
        username,
        email,
        role,
        action,
        details = {},
        ipAddress,
        userAgent,
        success = true
      } = options;

      const auditLog = new AuditLog({
        user: {
          id: userId,
          username,
          email,
          role
        },
        action,
        details,
        ipAddress,
        userAgent,
        success
      });

      await auditLog.save();
      return auditLog;
    } catch (error) {
      console.error('Audit log error:', error);
      // Optionally, you could implement a fallback logging mechanism
    }
  }

  // Retrieve audit logs with filtering
  static async getLogs(filters = {}, options = {}) {
    const {
      page = 1,
      limit = 50,
      sort = { timestamp: -1 }
    } = options;

    try {
      return await AuditLog.paginate(filters, {
        page,
        limit,
        sort
      });
    } catch (error) {
      console.error('Error retrieving audit logs:', error);
      throw error;
    }
  }

  // Generate comprehensive security report
  static async generateSecurityReport(timeframe = 30) {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - timeframe);

    try {
      const report = await AuditLog.aggregate([
        // Filter logs within timeframe
        {
          $match: {
            timestamp: { $gte: thirtyDaysAgo }
          }
        },
        
        // Group by action and calculate metrics
        {
          $group: {
            _id: '$action',
            totalCount: { $sum: 1 },
            successCount: {
              $sum: { $cond: [{ $eq: ['$success', true] }, 1, 0] }
            },
            failureCount: {
              $sum: { $cond: [{ $eq: ['$success', false] }, 1, 0] }
            },
            uniqueUsers: { $addToSet: '$user.id' }
          }
        },
        
        // Add additional insights
        {
          $addFields: {
            successRate: {
              $divide: ['$successCount', '$totalCount']
            },
            uniqueUserCount: { $size: '$uniqueUsers' }
          }
        },
        
        // Sort by total count
        { $sort: { totalCount: -1 } }
      ]);

      return {
        timeframe,
        generatedAt: new Date(),
        actionBreakdown: report
      };
    } catch (error) {
      console.error('Security report generation error:', error);
      throw error;
    }
  }

  // Detect potential security anomalies
  static async detectAnomalies() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    try {
      const anomalies = await AuditLog.aggregate([
        // Filter recent logs
        {
          $match: {
            timestamp: { $gte: twentyFourHoursAgo },
            success: false
          }
        },
        
        // Group by user and action
        {
          $group: {
            _id: {
              userId: '$user.id',
              username: '$user.username',
              action: '$action'
            },
            failureCount: { $sum: 1 }
          }
        },
        
        // Filter for high failure rates
        {
          $match: {
            failureCount: { $gt: 5 } // More than 5 failures
          }
        }
      ]);

      return {
        potentialSecurityThreats: anomalies,
        detectedAt: new Date()
      };
    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw error;
    }
  }
}

module.exports = AuditLogService;
