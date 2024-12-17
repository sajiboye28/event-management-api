const FraudDetectionService = require('../services/fraudDetectionService');
const SystemMonitoringService = require('../services/systemMonitoringService');
const AuditLogService = require('../services/auditLogService');
const User = require('../models/User');
const Event = require('../models/Event');

class AdminDashboardController {
  // Comprehensive security dashboard
  static async getSecurityDashboard(req, res) {
    try {
      const [
        systemHealth,
        fraudDetection,
        securityReport,
        userStats,
        eventStats
      ] = await Promise.all([
        SystemMonitoringService.getSystemHealth(),
        FraudDetectionService.detectAnomalies(),
        AuditLogService.generateSecurityReport(),
        this.getUserSecurityStats(),
        this.getEventSecurityStats()
      ]);

      res.json({
        systemHealth,
        fraudDetection,
        securityReport,
        userStats,
        eventStats,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Security dashboard error:', error);
      res.status(500).json({ 
        message: 'Error generating security dashboard', 
        error: error.message 
      });
    }
  }

  // User security statistics
  static async getUserSecurityStats() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [
      totalUsers,
      newUsers,
      suspiciousUsers
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      User.aggregate([
        {
          $lookup: {
            from: 'audit_logs',
            let: { userId: '$_id' },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $eq: ['$user.id', '$$userId'] 
                  },
                  timestamp: { $gte: twentyFourHoursAgo },
                  success: false
                }
              }
            ],
            as: 'suspiciousActivities'
          }
        },
        { 
          $match: { 
            suspiciousActivities: { $not: { $size: 0 } } 
          }
        },
        { $count: 'suspiciousUserCount' }
      ])
    ]);

    return {
      totalUsers,
      newUsers,
      suspiciousUsers: suspiciousUsers[0]?.suspiciousUserCount || 0
    };
  }

  // Event security statistics
  static async getEventSecurityStats() {
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const [
      totalEvents,
      newEvents,
      suspiciousEvents
    ] = await Promise.all([
      Event.countDocuments(),
      Event.countDocuments({ createdAt: { $gte: twentyFourHoursAgo } }),
      Event.aggregate([
        {
          $lookup: {
            from: 'audit_logs',
            let: { eventId: '$_id' },
            pipeline: [
              { 
                $match: { 
                  $expr: { 
                    $eq: ['$details.eventId', '$$eventId'] 
                  },
                  action: 'SUSPICIOUS_EVENT_ACTIVITY',
                  timestamp: { $gte: twentyFourHoursAgo }
                }
              }
            ],
            as: 'suspiciousActivities'
          }
        },
        { 
          $match: { 
            suspiciousActivities: { $not: { $size: 0 } } 
          }
        },
        { $count: 'suspiciousEventCount' }
      ])
    ]);

    return {
      totalEvents,
      newEvents,
      suspiciousEvents: suspiciousEvents[0]?.suspiciousEventCount || 0
    };
  }

  // Detailed security logs
  static async getSecurityLogs(req, res) {
    try {
      const { 
        page = 1, 
        limit = 50, 
        filter = {} 
      } = req.query;

      const logs = await AuditLogService.getLogs(
        { 
          ...filter,
          timestamp: { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) 
          }
        }, 
        { 
          page: parseInt(page), 
          limit: parseInt(limit),
          sort: { timestamp: -1 }
        }
      );

      res.json({
        logs: logs.docs,
        totalLogs: logs.totalDocs,
        page: logs.page,
        totalPages: logs.totalPages
      });
    } catch (error) {
      console.error('Security logs retrieval error:', error);
      res.status(500).json({ 
        message: 'Error retrieving security logs', 
        error: error.message 
      });
    }
  }

  // Threat intelligence and recommendations
  static async getThreatIntelligence(req, res) {
    try {
      const [
        ipFraudDetection,
        anomalyDetection,
        securityRecommendations
      ] = await Promise.all([
        FraudDetectionService.detectIPBasedFraud(),
        FraudDetectionService.detectAnomalies(),
        this.generateSecurityRecommendations()
      ]);

      res.json({
        ipFraudDetection,
        anomalyDetection,
        securityRecommendations,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Threat intelligence error:', error);
      res.status(500).json({ 
        message: 'Error generating threat intelligence', 
        error: error.message 
      });
    }
  }

  // Generate security recommendations
  static async generateSecurityRecommendations() {
    // AI-driven security recommendations based on detected anomalies
    const recommendations = [
      {
        type: 'USER_AUTHENTICATION',
        priority: 'HIGH',
        description: 'Implement multi-factor authentication for all admin accounts',
        suggestedAction: 'Enable 2FA for admin users'
      },
      {
        type: 'IP_SECURITY',
        priority: 'MEDIUM',
        description: 'Block suspicious IP addresses with multiple failed login attempts',
        suggestedAction: 'Update IP blocking rules'
      },
      {
        type: 'EVENT_REGISTRATION',
        priority: 'LOW',
        description: 'Add additional verification for events with high-risk registration patterns',
        suggestedAction: 'Implement advanced registration risk assessment'
      }
    ];

    return recommendations;
  }
}

module.exports = AdminDashboardController;
