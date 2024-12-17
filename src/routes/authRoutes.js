const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const AuthController = require('../controllers/authController');
const { validateRegistration, validateLogin } = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validateRegistration, AuthController.register);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', validateLogin, AuthController.login);

// @route   GET /api/auth/me
// @desc    Get logged in user
// @access  Private
router.get('/me', authMiddleware, AuthController.getMe);

module.exports = router;
