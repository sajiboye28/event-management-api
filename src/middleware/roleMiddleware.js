const User = require('../models/User');

// Role-based access control middleware
const roleMiddleware = {
  // Check if user is an admin
  isAdmin: async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. Admin privileges required.',
          requiredRole: 'admin',
          userRole: user.role
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ 
        message: 'Error checking user role', 
        error: error.message 
      });
    }
  },

  // Check if user is an event organizer
  isEventOrganizer: async (req, res, next) => {
    try {
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (user.role !== 'organizer' && user.role !== 'admin') {
        return res.status(403).json({ 
          message: 'Access denied. Event organizer privileges required.',
          requiredRole: 'organizer',
          userRole: user.role
        });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ 
        message: 'Error checking user role', 
        error: error.message 
      });
    }
  },

  // Flexible role checker
  hasRole: (roles) => {
    return async (req, res, next) => {
      try {
        const user = await User.findById(req.user.id);
        
        if (!user) {
          return res.status(401).json({ message: 'User not found' });
        }

        if (!roles.includes(user.role)) {
          return res.status(403).json({ 
            message: 'Access denied. Insufficient privileges.',
            requiredRoles: roles,
            userRole: user.role
          });
        }

        next();
      } catch (error) {
        console.error('Role middleware error:', error);
        res.status(500).json({ 
          message: 'Error checking user role', 
          error: error.message 
        });
      }
    };
  }
};

module.exports = roleMiddleware;
