const mongoose = require('mongoose');
const AuditLogService = require('./auditLogService');
const FraudDetectionService = require('./fraudDetectionService');
const SystemMonitoringService = require('./systemMonitoringService');

class AlertService {
  // Alert types and severity levels
  static ALERT_TYPES = {
    SYSTEM_PERFORMANCE: 'SYSTEM_PERFORMANCE',
    SECURITY_BREACH: 'SECURITY_BREACH',
    FRAUD_DETECTION: 'FRAUD_DETECTION',
    NETWORK_ANOMALY: 'NETWORK_ANOMALY'
  };

  static SEVERITY_LEVELS = {
    LOW: 'LOW',
    MEDIUM: 'MEDIUM',
    HIGH: 'HIGH',
    CRITICAL: 'CRITICAL'
  };

  // Generate real-time system performance alerts
  static async checkSystemPerformance() {
    try {
      const systemHealth = await SystemMonitoringService.getSystemHealth();

      const alerts = [];

      // CPU Usage Alert
      if (systemHealth.cpu.usage > 80) {
        alerts.push({
          type: this.ALERT_TYPES.SYSTEM_PERFORMANCE,
          severity: systemHealth.cpu.usage > 90 
            ? this.SEVERITY_LEVELS.CRITICAL 
            : this.SEVERITY_LEVELS.HIGH,
          title: 'High CPU Utilization',
          description: `CPU usage is at ${systemHealth.cpu.usage}%`,
          timestamp: new Date()
        });
      }

      // Memory Usage Alert
      if (systemHealth.memory.usedPercentage > 85) {
        alerts.push({
          type: this.ALERT_TYPES.SYSTEM_PERFORMANCE,
          severity: systemHealth.memory.usedPercentage > 95 
            ? this.SEVERITY_LEVELS.CRITICAL 
            : this.SEVERITY_LEVELS.HIGH,
          title: 'High Memory Consumption',
          description: `Memory usage is at ${systemHealth.memory.usedPercentage}%`,
          timestamp: new Date()
        });
      }

      return alerts;
    } catch (error) {
      console.error('System performance alert generation error:', error);
      return [];
    }
  }

  // Generate fraud detection alerts
  static async checkFraudActivity() {
    try {
      const [ipFraudDetection, anomalyDetection] = await Promise.all([
        FraudDetectionService.detectIPBasedFraud(),
        FraudDetectionService.detectAnomalies()
      ]);

      const alerts = [];

      // IP-based Fraud Alerts
      if (ipFraudDetection.suspiciousIPs.length > 0) {
        alerts.push({
          type: this.ALERT_TYPES.FRAUD_DETECTION,
          severity: this.SEVERITY_LEVELS.HIGH,
          title: 'Suspicious IP Activity Detected',
          description: `${ipFraudDetection.suspiciousIPs.length} suspicious IP addresses identified`,
          details: ipFraudDetection.suspiciousIPs,
          timestamp: new Date()
        });
      }

      // Anomaly Detection Alerts
      if (anomalyDetection.anomalies.length > 0) {
        alerts.push({
          type: this.ALERT_TYPES.NETWORK_ANOMALY,
          severity: this.SEVERITY_LEVELS.MEDIUM,
          title: 'User Behavior Anomalies Detected',
          description: `${anomalyDetection.anomalies.length} users showing unusual behavior patterns`,
          details: anomalyDetection.anomalies,
          timestamp: new Date()
        });
      }

      return alerts;
    } catch (error) {
      console.error('Fraud activity alert generation error:', error);
      return [];
    }
  }

  // Comprehensive alert monitoring service
  static async runAlertMonitoring() {
    try {
      const [performanceAlerts, fraudAlerts] = await Promise.all([
        this.checkSystemPerformance(),
        this.checkFraudActivity()
      ]);

      const combinedAlerts = [...performanceAlerts, ...fraudAlerts];

      // Log alerts to audit log
      for (const alert of combinedAlerts) {
        await AuditLogService.log({
          action: 'SYSTEM_ALERT',
          details: alert
        });
      }

      return combinedAlerts;
    } catch (error) {
      console.error('Comprehensive alert monitoring error:', error);
      return [];
    }
  }

  // Real-time alert notification mechanism
  static setupAlertNotifications(io) {
    // Run alert monitoring every 5 minutes
    const alertInterval = setInterval(async () => {
      try {
        const alerts = await this.runAlertMonitoring();
        
        // Broadcast alerts to connected admin clients
        if (alerts.length > 0) {
          io.of('/admin-monitoring').emit('securityAlerts', alerts);
        }
      } catch (error) {
        console.error('Alert notification error:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    return alertInterval;
  }

  // Send targeted alerts for specific events
  static async sendTargetedAlert(userId, alertType, details) {
    try {
      const alert = {
        type: alertType,
        userId,
        details,
        timestamp: new Date()
      };

      // Log to audit service
      await AuditLogService.log({
        userId,
        action: 'TARGETED_ALERT',
        details: alert
      });

      return alert;
    } catch (error) {
      console.error('Targeted alert generation error:', error);
      return null;
    }
  }
}

module.exports = AlertService;
