const os = require('os');
const AuditLogService = require('../services/auditLogService');

class LoggingMiddleware {
  // Comprehensive request logging middleware
  static async logRequest(req, res, next) {
    const startTime = Date.now();

    // Capture original methods
    const originalEnd = res.end;
    const originalJson = res.json;

    // Request tracking
    const requestId = this.generateRequestId();
    req.requestId = requestId;

    // Capture request details
    const requestDetails = {
      requestId,
      method: req.method,
      path: req.path,
      headers: this.sanitizeHeaders(req.headers),
      query: req.query,
      body: this.sanitizeBody(req.body),
      timestamp: new Date(),
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    };

    // System context
    const systemContext = {
      hostname: os.hostname(),
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: os.cpus()[0].model
    };

    // Modify response methods for tracking
    res.end = function(chunk, encoding) {
      res.responseTime = Date.now() - startTime;
      res.requestId = requestId;
      return originalEnd.call(this, chunk, encoding);
    };

    res.json = function(body) {
      res.responseTime = Date.now() - startTime;
      res.requestId = requestId;
      return originalJson.call(this, body);
    };

    // Log request start
    await AuditLogService.log({
      action: 'API_REQUEST_START',
      details: {
        ...requestDetails,
        systemContext
      }
    });

    // Response tracking
    res.on('finish', async () => {
      try {
        await AuditLogService.log({
          userId: req.user?.id,
          action: 'API_REQUEST_COMPLETE',
          details: {
            ...requestDetails,
            statusCode: res.statusCode,
            responseTime: res.responseTime,
            responseSize: res.get('Content-Length'),
            systemContext
          },
          success: res.statusCode < 400
        });

        // Performance warning for slow requests
        if (res.responseTime > 1000) {
          await AuditLogService.log({
            action: 'PERFORMANCE_WARNING',
            details: {
              requestId,
              method: req.method,
              path: req.path,
              responseTime: res.responseTime
            }
          });
        }
      } catch (error) {
        console.error('Logging middleware error:', error);
      }
    });

    next();
  }

  // Generate unique request identifier
  static generateRequestId() {
    return `REQ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Sanitize headers to prevent sensitive information exposure
  static sanitizeHeaders(headers) {
    const sensitiveHeaders = ['authorization', 'cookie', 'set-cookie'];
    return Object.keys(headers)
      .filter(key => !sensitiveHeaders.includes(key.toLowerCase()))
      .reduce((obj, key) => {
        obj[key] = headers[key];
        return obj;
      }, {});
  }

  // Sanitize request body to prevent logging of sensitive data
  static sanitizeBody(body) {
    if (!body) return null;

    const sensitiveFields = [
      'password', 
      'token', 
      'creditCard', 
      'ssn'
    ];

    const sanitizedBody = { ...body };
    sensitiveFields.forEach(field => {
      if (sanitizedBody[field]) {
        sanitizedBody[field] = '***REDACTED***';
      }
    });

    return sanitizedBody;
  }

  // Error logging middleware
  static async logError(err, req, res, next) {
    await AuditLogService.log({
      action: 'SERVER_ERROR',
      details: {
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack,
        requestPath: req.path,
        requestMethod: req.method
      },
      success: false
    });

    // Default error handler
    res.status(err.status || 500).json({
      error: 'An unexpected error occurred',
      requestId: req.requestId
    });

    next(err);
  }
}

module.exports = LoggingMiddleware;
