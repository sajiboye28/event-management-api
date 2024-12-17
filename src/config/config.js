// Configuration variables
module.exports = {
  PORT: process.env.PORT || 3000,
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/event_management_db',
  EMAIL_SERVICE: {
    HOST: process.env.EMAIL_HOST,
    PORT: process.env.EMAIL_PORT,
    USER: process.env.EMAIL_USER,
    PASS: process.env.EMAIL_PASS
  },
  PAYMENT_CONFIG: {
    API_KEY: process.env.PAYMENT_API_KEY,
    SECRET_KEY: process.env.PAYMENT_SECRET_KEY
  }
};
