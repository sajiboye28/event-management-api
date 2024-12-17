const User = require('../models/User');
const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Enhanced user registration
exports.register = async (req, res) => {
  try {
    const { 
      username, 
      email, 
      password, 
      role = 'user',
      profile,
      contactInfo,
      preferences
    } = req.body;

    // Check if user already exists
    let existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({ 
        message: 'User already exists',
        conflictFields: {
          email: existingUser.email === email,
          username: existingUser.username === username
        }
      });
    }

    // Create new user
    const newUser = new User({
      username,
      email,
      password,
      role: ['user', 'organizer', 'admin'].includes(role) ? role : 'user',
      profile: profile || {},
      contactInfo: contactInfo || {},
      preferences: preferences || {}
    });

    // Save user
    await newUser.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: newUser._id, 
        username: newUser.username,
        role: newUser.role 
      }, 
      config.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'User registered successfully',
      user: newUser.toPublicProfile(),
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Registration failed', 
      error: error.message 
    });
  }
};

// Enhanced login with role tracking
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ 
        message: 'Invalid credentials',
        loginAttempt: {
          email,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check password
    const isMatch = await user.isValidPassword(password);

    if (!isMatch) {
      return res.status(401).json({ 
        message: 'Invalid credentials',
        loginAttempt: {
          email,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        message: 'Account is not active',
        accountStatus: 'inactive'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        role: user.role 
      }, 
      config.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful',
      user: user.toPublicProfile(),
      token,
      loginTimestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      message: 'Login failed', 
      error: error.message 
    });
  }
};