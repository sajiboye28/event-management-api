const jwt = require('jsonwebtoken');
const config = require('../config/config');

const generateToken = (userId) => {
  const payload = {
    user: {
      id: userId
    }
  };

  return jwt.sign(
    payload, 
    config.JWT_SECRET, 
    { expiresIn: '1h' }
  );
};

module.exports = generateToken;
