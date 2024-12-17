const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

// Role-based access control middleware
const ROLES = {
  ADMIN: 'admin',
  ORGANIZER: 'organizer',
  ATTENDEE: 'attendee'
};

// Authentication middleware with enhanced features
const authMiddleware = {
  // Basic token verification
  verifyToken: function(req, res, next) {
    const token = req.header('x-auth-token') || req.headers.authorization?.split(' ')[1];

    if (!token) {
      logger.warn('No authentication token provided', { 
        path: req.path, 
        method: req.method 
      });
      return res.status(401).json({ 
        message: 'No token, authorization denied',
        error: 'Authentication required' 
      });
    }

    try {
      const decoded = jwt.verify(token, config.JWT_SECRET);
      
      // Additional token validation
      if (decoded.exp < Date.now() / 1000) {
        logger.warn('Expired token attempted', { 
          userId: decoded.user.id 
        });
        return res.status(401).json({ 
          message: 'Token expired', 
          error: 'Please log in again' 
        });
      }

      req.user = decoded.user;
      next();
    } catch (err) {
      logger.error('Token verification failed', { 
        error: err.message,
        path: req.path 
      });
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ 
          message: 'Token expired', 
          error: 'Please log in again' 
        });
      }
      
      res.status(401).json({ 
        message: 'Token is not valid', 
        error: 'Authentication failed' 
      });
    }
  },

  // Role-based access control
  requireRole: function(allowedRoles) {
    return (req, res, next) => {
      // Ensure user is authenticated first
      if (!req.user) {
        return res.status(401).json({ 
          message: 'Authentication required', 
          error: 'Please log in' 
        });
      }

      // Check if user's role is in the allowed roles
      if (!allowedRoles.includes(req.user.role)) {
        logger.warn('Unauthorized role access attempt', { 
          userId: req.user.id, 
          userRole: req.user.role, 
          requiredRoles: allowedRoles 
        });
        
        return res.status(403).json({ 
          message: 'Access denied', 
          error: 'Insufficient permissions' 
        });
      }

      next();
    };
  },

  // Generate JWT token
  generateToken: function(user) {
    const payload = {
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    };

    return jwt.sign(payload, config.JWT_SECRET, { 
      expiresIn: '24h',  // Token expires in 24 hours
      issuer: 'EventManagementAPI'
    });
  },

  // Roles enum for consistent role management
  ROLES: ROLES
};

module.exports = authMiddleware;
