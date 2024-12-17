const User = require('../models/User');
const Event = require('../models/Event');
const AuditLogService = require('./auditLogService');
const mongoose = require('mongoose');

class FraudDetectionService {
  // Enhanced risk scoring algorithm
  static calculateRiskScore(user, activities) {
    let riskScore = 0;
    const now = new Date();

    // Account age factor (more weight for newer accounts)
    const accountAgeInDays = (now - user.createdAt) / (1000 * 3600 * 24);
    if (accountAgeInDays < 30) riskScore += 3;
    if (accountAgeInDays < 60) riskScore += 2;

    // Login attempt analysis
    const failedLogins = activities.filter(
      log => log.action === 'LOGIN_ATTEMPT' && !log.success
    );
    riskScore += Math.min(failedLogins.length * 0.5, 2);

    // Geolocation inconsistency
    const uniqueLoginLocations = new Set(
      activities.map(log => log.details?.location).filter(Boolean)
    );
    if (uniqueLoginLocations.size > 3) riskScore += 1;

    // Device variation
    const uniqueDevices = new Set(
      activities.map(log => log.details?.userAgent).filter(Boolean)
    );
    if (uniqueDevices.size > 3) riskScore += 1;

    // Time-based anomalies
    const loginTimestamps = activities
      .filter(log => log.action === 'LOGIN_ATTEMPT')
      .map(log => new Date(log.timestamp));
  
    const timeDifferences = loginTimestamps.map((time, index) => 
      index > 0 ? Math.abs(time - loginTimestamps[index - 1]) : 0
    );
  
    const irregularTimePatterns = timeDifferences.filter(
      diff => diff < 60000 || diff > 86400000 // Unusual time gaps
    );
  
    if (irregularTimePatterns.length > 2) riskScore += 1;

    // Normalize risk score
    return Math.min(Math.max(riskScore, 0), 10);
  }

  // Enhanced risk level determination
  static determineRiskLevel(riskScore) {
    if (riskScore <= 2) return 'LOW';
    if (riskScore <= 5) return 'MEDIUM';
    if (riskScore <= 7) return 'HIGH';
    return 'CRITICAL';
  }

  // Updated suspicious activity detection
  static async detectSuspiciousUserActivity(userId) {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Fetch user and recent activities
      const [user, suspiciousActivities] = await Promise.all([
        User.findById(userId),
        AuditLogService.getLogs({
          'user.id': mongoose.Types.ObjectId(userId),
          timestamp: { $gte: twentyFourHoursAgo }
        })
      ]);

      // Calculate risk score
      const riskScore = this.calculateRiskScore(user, suspiciousActivities.docs);
      const riskLevel = this.determineRiskLevel(riskScore);

      // Additional contextual checks
      const contextualRisks = {
        multipleDevices: new Set(
          suspiciousActivities.docs.map(log => log.details?.userAgent)
        ).size > 2,
        geographicalInconsistency: new Set(
          suspiciousActivities.docs.map(log => log.details?.location)
        ).size > 2
      };

      // Log comprehensive risk assessment
      await AuditLogService.log({
        userId,
        action: 'ADVANCED_RISK_ASSESSMENT',
        details: {
          riskScore,
          riskLevel,
          contextualRisks,
          suspiciousActivitiesCount: suspiciousActivities.docs.length
        }
      });

      return {
        userId,
        riskScore,
        riskLevel,
        suspiciousActivities: suspiciousActivities.docs,
        contextualRisks
      };
    } catch (error) {
      console.error('Advanced suspicious activity detection error:', error);
      throw error;
    }
  }

  // Advanced IP-based fraud detection
  static async detectIPBasedFraud() {
    try {
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      // Aggregate IP-based suspicious activities
      const ipFraudDetection = await AuditLogService.getLogs({
        timestamp: { $gte: twentyFourHoursAgo },
        success: false
      }, {
        // Group by IP address
        $group: {
          _id: '$ipAddress',
          failedAttempts: { $sum: 1 },
          uniqueUsers: { $addToSet: '$user.id' },
          actions: { $push: '$action' }
        }
      });

      // Filter potentially fraudulent IP addresses
      const suspiciousIPs = ipFraudDetection.filter(
        ip => ip.failedAttempts > 10 || ip.uniqueUsers.length > 3
      );

      // Log IP-based fraud detection
      await AuditLogService.log({
        action: 'IP_FRAUD_DETECTION',
        details: {
          suspiciousIPs: suspiciousIPs.map(ip => ip._id),
          totalSuspiciousIPs: suspiciousIPs.length
        }
      });

      return {
        suspiciousIPs,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('IP-based fraud detection error:', error);
      throw error;
    }
  }

  // Machine learning-inspired anomaly detection
  static async detectAnomalies() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Collect baseline user behavior
      const userBaselines = await User.aggregate([
        { 
          $match: { 
            lastLogin: { $gte: thirtyDaysAgo } 
          }
        },
        {
          $group: {
            _id: '$_id',
            avgLoginFrequency: { $avg: '$loginCount' },
            avgEventRegistrations: { $avg: { $size: '$registeredEvents' } },
            loginLocations: { $addToSet: '$lastLoginLocation' }
          }
        }
      ]);

      // Detect deviations from baseline
      const anomalies = await User.aggregate([
        { 
          $match: { 
            lastLogin: { $gte: thirtyDaysAgo } 
          }
        },
        {
          $lookup: {
            from: 'events',
            localField: '_id',
            foreignField: 'participants',
            as: 'recentEvents'
          }
        },
        {
          $addFields: {
            recentEventCount: { $size: '$recentEvents' }
          }
        },
        {
          $addFields: {
            loginDeviation: {
              $abs: {
                $subtract: [
                  '$loginCount', 
                  { $arrayElemAt: [userBaselines.map(b => b.avgLoginFrequency), 0] }
                ]
              }
            },
            eventDeviation: {
              $abs: {
                $subtract: [
                  '$recentEventCount', 
                  { $arrayElemAt: [userBaselines.map(b => b.avgEventRegistrations), 0] }
                ]
              }
            }
          }
        },
        {
          $match: {
            $or: [
              { loginDeviation: { $gt: 3 } },
              { eventDeviation: { $gt: 2 } }
            ]
          }
        }
      ]);

      // Log anomaly detection results
      await AuditLogService.log({
        action: 'ANOMALY_DETECTION',
        details: {
          anomalousUsers: anomalies.map(a => a._id),
          totalAnomalies: anomalies.length
        }
      });

      return {
        anomalies,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Anomaly detection error:', error);
      throw error;
    }
  }

  // Comprehensive fraud prevention strategy
  static async runComprehensiveFraudCheck(userId) {
    try {
      const [
        userActivityCheck, 
        ipFraudCheck, 
        anomalyDetection
      ] = await Promise.all([
        this.detectSuspiciousUserActivity(userId),
        this.detectIPBasedFraud(),
        this.detectAnomalies()
      ]);

      // Combine results and assess overall risk
      const overallRiskAssessment = {
        userId,
        userActivityRisk: userActivityCheck.riskLevel,
        ipFraudRisk: ipFraudCheck.suspiciousIPs.length > 0 ? 'HIGH' : 'LOW',
        anomalyRisk: anomalyDetection.anomalies.length > 0 ? 'MEDIUM' : 'LOW'
      };

      // Log comprehensive fraud check
      await AuditLogService.log({
        userId,
        action: 'COMPREHENSIVE_FRAUD_CHECK',
        details: overallRiskAssessment
      });

      return overallRiskAssessment;
    } catch (error) {
      console.error('Comprehensive fraud check error:', error);
      throw error;
    }
  }
}

module.exports = FraudDetectionService;
