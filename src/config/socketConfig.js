const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const AlertService = require('../services/alertService');
const SystemMonitoringService = require('../services/systemMonitoringService');

class SocketConfig {
  static initSocketServer(server) {
    const io = socketIo(server, {
      cors: {
        origin: ['http://localhost:3000', 'https://admin.eventmanagement.com'],
        methods: ['GET', 'POST']
      },
      path: '/admin-monitoring'
    });

    // Namespace for admin monitoring
    const adminNamespace = io.of('/admin-monitoring');

    // Authentication middleware
    adminNamespace.use((socket, next) => {
      const token = socket.handshake.query.token;
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Ensure user has admin privileges
        if (decoded.role !== 'admin') {
          return next(new Error('Unauthorized'));
        }
        
        socket.user = decoded;
        next();
      } catch (error) {
        next(new Error('Authentication error'));
      }
    });

    // Connection handler
    adminNamespace.on('connection', (socket) => {
      console.log('Admin client connected:', socket.id);

      // Periodic system health updates
      const healthInterval = setInterval(async () => {
        try {
          const systemHealth = await SystemMonitoringService.getSystemHealth();
          socket.emit('systemHealth', systemHealth);
        } catch (error) {
          console.error('System health broadcast error:', error);
        }
      }, 60000); // Every minute

      // Performance metrics stream
      const performanceInterval = setInterval(async () => {
        try {
          const performanceMetrics = await SystemMonitoringService.collectPerformanceMetrics();
          socket.emit('performanceMetrics', performanceMetrics);
        } catch (error) {
          console.error('Performance metrics broadcast error:', error);
        }
      }, 30000); // Every 30 seconds

      // Disconnect handler
      socket.on('disconnect', () => {
        clearInterval(healthInterval);
        clearInterval(performanceInterval);
        console.log('Admin client disconnected:', socket.id);
      });
    });

    // Setup alert notifications
    const alertInterval = AlertService.setupAlertNotifications(io);

    return {
      io,
      adminNamespace,
      alertInterval
    };
  }

  // Centralized event broadcasting
  static broadcastEvent(io, eventName, data) {
    io.of('/admin-monitoring').emit(eventName, data);
  }

  // Send targeted alert to specific user
  static sendTargetedAlert(io, userId, alertData) {
    io.of('/admin-monitoring').emit('targetedAlert', {
      userId,
      ...alertData
    });
  }
}

module.exports = SocketConfig;
