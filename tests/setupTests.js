// Global test setup
const mongoose = require('mongoose');

// Increase timeout for async operations
jest.setTimeout(10000);

// Optional: Global error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Optional: Cleanup after tests
afterAll(async () => {
  // Close mongoose connection
  await mongoose.connection.close();
});
