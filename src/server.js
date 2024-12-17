require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const eventRoutes = require('./routes/eventRoutes');

// Create Express app
const app = express();

// Basic middleware
app.use(express.json());
app.use(cors());

// Mount routes
app.use('/api/events', eventRoutes);

// Basic routes
app.get('/', (req, res) => {
  res.json({ 
    message: 'Server is running',
    status: 'active',
    timestamp: new Date().toISOString(),
    endpoints: {
      events: '/api/events',
      health: '/health',
      info: '/api/info'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// API Information
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Event Management API',
    version: '1.0.0',
    description: 'API for managing events and related services',
    endpoints: [
      { path: '/', method: 'GET', description: 'API root' },
      { path: '/health', method: 'GET', description: 'Health check' },
      { path: '/api/info', method: 'GET', description: 'API information' },
      { path: '/api/events', method: 'GET', description: 'List all events' },
      { path: '/api/events/:id', method: 'GET', description: 'Get event by ID' },
      { path: '/api/events', method: 'POST', description: 'Create new event' },
      { path: '/api/events/:id', method: 'PUT', description: 'Update event' },
      { path: '/api/events/:id', method: 'DELETE', description: 'Delete event' }
    ]
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    status: 'error',
    message: 'Something went wrong!'
  });
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/event_management_db';
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✓ MongoDB Connected');
    app.listen(PORT, () => {
      console.log(`✓ Server is running on http://localhost:${PORT}`);
      console.log('Available endpoints:');
      console.log('  - GET  /          (Root endpoint)');
      console.log('  - GET  /health    (Health check)');
      console.log('  - GET  /api/info  (API information)');
      console.log('  - GET  /api/events (Events API)');
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
