const os = require('os');
const v8 = require('v8');
const mongoose = require('mongoose');
const AuditLogService = require('./auditLogService');

class SystemMonitoringService {
  // Collect comprehensive system health metrics
  static async getSystemHealth() {
    try {
      // CPU and Memory Metrics
      const cpuUsage = process.cpuUsage();
      const memoryUsage = process.memoryUsage();
      
      // Database Connection Pool
      const mongoConnections = mongoose.connection.readyState;
      
      // Heap Statistics
      const heapStats = v8.getHeapStatistics();

      // System Load
      const systemLoad = os.loadavg();

      // Disk Usage (Simplified for Node.js)
      const diskUsage = {
        free: os.freemem(),
        total: os.totalmem(),
        usedPercentage: ((os.totalmem() - os.freemem()) / os.totalmem()) * 100
      };

      return {
        timestamp: new Date(),
        cpu: {
          usage: cpuUsage,
          cores: os.cpus().length,
          systemLoad
        },
        memory: {
          total: memoryUsage.heapTotal,
          used: memoryUsage.heapUsed,
          rss: memoryUsage.rss,
          usedPercentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
        },
        heap: {
          totalHeapSize: heapStats.total_heap_size,
          usedHeapSize: heapStats.used_heap_size,
          heapSizeLimit: heapStats.heap_size_limit
        },
        database: {
          connectionState: this.getMongoConnectionState(mongoConnections),
          connectionDetails: mongoose.connection
        },
        disk: diskUsage,
        uptime: process.uptime()
      };
    } catch (error) {
      console.error('System health monitoring error:', error);
      throw error;
    }
  }

  // Translate MongoDB connection state
  static getMongoConnectionState(state) {
    const states = {
      0: 'DISCONNECTED',
      1: 'CONNECTED',
      2: 'CONNECTING',
      3: 'DISCONNECTING'
    };
    return states[state] || 'UNKNOWN';
  }

  // Performance and Error Tracking
  static async trackPerformance(req, res, next) {
    const startTime = Date.now();

    // Capture original end and json methods
    const originalEnd = res.end;
    const originalJson = res.json;

    res.end = function(chunk, encoding) {
      res.responseTime = Date.now() - startTime;
      return originalEnd.call(this, chunk, encoding);
    };

    res.json = function(body) {
      res.responseTime = Date.now() - startTime;
      return originalJson.call(this, body);
    };

    // Log performance and potential errors
    res.on('finish', async () => {
      try {
        await AuditLogService.log({
          userId: req.user?.id,
          action: 'API_REQUEST',
          details: {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            responseTime: res.responseTime,
            userAgent: req.get('User-Agent'),
            ipAddress: req.ip
          },
          success: res.statusCode < 400
        });

        // Performance warning for slow requests
        if (res.responseTime > 1000) {
          console.warn(`Slow request detected: ${req.method} ${req.path} - ${res.responseTime}ms`);
        }
      } catch (error) {
        console.error('Performance tracking error:', error);
      }
    });

    next();
  }

  // Advanced Error Monitoring
  static async monitorErrors() {
    // Global error handler
    process.on('uncaughtException', async (error) => {
      console.error('Uncaught Exception:', error);
      
      await AuditLogService.log({
        action: 'SYSTEM_CRITICAL_ERROR',
        details: {
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack
        },
        success: false
      });

      // Graceful shutdown
      process.exit(1);
    });

    // Unhandled Promise Rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      
      await AuditLogService.log({
        action: 'UNHANDLED_PROMISE_REJECTION',
        details: {
          reason: reason?.toString(),
          promise: promise.toString()
        },
        success: false
      });
    });
  }

  // Generate Comprehensive System Report
  static async generateSystemReport() {
    try {
      const [systemHealth, securityReport, performanceLogs] = await Promise.all([
        this.getSystemHealth(),
        AuditLogService.generateSecurityReport(),
        AuditLogService.getLogs({ 
          action: 'API_REQUEST' 
        }, { 
          limit: 100, 
          sort: { timestamp: -1 } 
        })
      ]);

      return {
        systemHealth,
        securityReport,
        performanceLogs: performanceLogs.docs,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('System report generation error:', error);
      throw error;
    }
  }
}

module.exports = SystemMonitoringService;
