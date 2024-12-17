const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

class SecurityConfig {
  // Helmet security middleware
  static helmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ['\'self\''],
          scriptSrc: ['\'self\'', '\'unsafe-inline\'', 'trusted-cdn.com'],
          styleSrc: ['\'self\'', '\'unsafe-inline\'', 'trusted-cdn.com'],
          imgSrc: ['\'self\'', 'data:', 'trusted-cdn.com']
        }
      },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
    });
  }

  // Rate limiting configuration
  static rateLimitConfig() {
    return {
      // General API rate limiting
      general: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // Limit each IP to 100 requests per windowMs
        message: 'Too many requests, please try again later'
      }),

      // Strict rate limiting for authentication routes
      auth: rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // Limit each IP to 10 login attempts per windowMs
        message: 'Too many login attempts, please try again later'
      }),

      // Event registration rate limiting
      eventRegistration: rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour
        max: 20, // Limit event registrations
        message: 'Exceeded event registration limit'
      })
    };
  }

  // CORS configuration
  static corsConfig() {
    return cors({
      origin: [
        'http://localhost:3000',
        'https://admin.eventmanagement.com',
        'https://api.eventmanagement.com'
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With', 
        'Accept'
      ],
      credentials: true,
      maxAge: 3600
    });
  }

  // Data sanitization middleware
  static dataSanitizationConfig() {
    return {
      // Prevent NoSQL injection
      mongoSanitize: mongoSanitize({
        replaceWith: '_',
        onSanitize: ({ req, key }) => {
          console.warn(`Sanitized ${key} to prevent NoSQL injection`);
        }
      }),

      // Prevent XSS attacks
      xss: xss(),

      // Prevent HTTP Parameter Pollution
      hpp: hpp({
        whitelist: [
          'sort', 
          'fields', 
          'page', 
          'limit'
        ]
      })
    };
  }

  // Advanced security headers
  static securityHeadersConfig() {
    return {
      // Prevent clickjacking
      frameGuard: helmet.frameguard({ action: 'deny' }),

      // Strict transport security
      hsts: helmet.hsts({
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
      }),

      // Disable powered-by header
      hidePoweredBy: helmet.hidePoweredBy({ setTo: 'PHP 7.4.3' }) // Misdirection
    };
  }

  // Comprehensive security middleware setup
  static setupSecurityMiddleware(app) {
    // Apply security middlewares
    app.use(this.helmetConfig());
    app.use(this.corsConfig());
    
    // Rate limiting
    app.use('/api/', this.rateLimitConfig().general);
    app.use('/api/auth/', this.rateLimitConfig().auth);
    app.use('/api/events/register', this.rateLimitConfig().eventRegistration);

    // Data sanitization
    const sanitization = this.dataSanitizationConfig();
    app.use(sanitization.mongoSanitize);
    app.use(sanitization.xss);
    app.use(sanitization.hpp);

    // Additional security headers
    const securityHeaders = this.securityHeadersConfig();
    app.use(securityHeaders.frameGuard);
    app.use(securityHeaders.hsts);
    app.use(securityHeaders.hidePoweredBy);

    return app;
  }

  // Generate secure random tokens
  static generateSecureToken(length = 32) {
    return require('crypto').randomBytes(length).toString('hex');
  }

  // Validate and sanitize user input
  static validateInput(input, rules) {
    const Joi = require('joi');
    
    const schema = Joi.object(rules);
    const { error, value } = schema.validate(input);

    if (error) {
      throw new Error(`Validation Error: ${error.details[0].message}`);
    }

    return value;
  }
}

module.exports = SecurityConfig;
