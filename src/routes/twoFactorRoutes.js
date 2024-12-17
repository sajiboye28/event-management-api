const express = require('express');
const router = express.Router();
const TwoFactorService = require('../services/twoFactorService');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');

// Enable Two-Factor Authentication
router.post('/enable', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    // If token is provided, verify it
    if (token) {
      const user = await User.findById(userId).select('+twoFactorSecret');
      
      if (!user.twoFactorSecret) {
        return res.status(400).json({ 
          message: 'Two-factor setup not initiated' 
        });
      }

      const isValid = TwoFactorService.verifyToken(
        user.twoFactorSecret, 
        token
      );

      if (!isValid) {
        return res.status(400).json({ 
          message: 'Invalid verification token' 
        });
      }
    }

    // Generate 2FA setup
    const setup = await TwoFactorService.enableTwoFactor(userId);

    // Generate backup codes
    const backupCodes = TwoFactorService.generateBackupCodes();

    // Save backup codes to user
    const user = await User.findById(userId);
    user.twoFactorBackupCodes = backupCodes;
    await user.save();

    res.json({
      message: 'Two-factor authentication enabled',
      qrCode: setup.qrCode,
      backupCodes: backupCodes.map(bc => bc.code)
    });
  } catch (error) {
    console.error('2FA enable error:', error);
    res.status(500).json({ 
      message: 'Error enabling two-factor authentication', 
      error: error.message 
    });
  }
});

// Disable Two-Factor Authentication
router.post('/disable', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { token } = req.body;

    // Find user with 2FA secret
    const user = await User.findById(userId).select('+twoFactorSecret');

    // Verify token
    if (!user.twoFactorEnabled) {
      return res.status(400).json({ 
        message: 'Two-factor authentication is not enabled' 
      });
    }

    const isValid = TwoFactorService.verifyToken(
      user.twoFactorSecret, 
      token
    );

    if (!isValid) {
      return res.status(400).json({ 
        message: 'Invalid verification token' 
      });
    }

    // Disable 2FA
    await TwoFactorService.disableTwoFactor(userId);

    res.json({
      message: 'Two-factor authentication disabled'
    });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ 
      message: 'Error disabling two-factor authentication', 
      error: error.message 
    });
  }
});

// Verify Two-Factor Token during Login
router.post('/verify', async (req, res) => {
  try {
    const { email, token, backupCode } = req.body;

    // Find user with 2FA secret
    const user = await User.findOne({ email })
      .select('+twoFactorSecret +twoFactorBackupCodes');

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ 
        message: 'Two-factor authentication not enabled' 
      });
    }

    // Check regular token
    const isTokenValid = TwoFactorService.verifyToken(
      user.twoFactorSecret, 
      token
    );

    // Check backup codes
    let isBackupCodeValid = false;
    if (backupCode) {
      const backupCodeEntry = user.twoFactorBackupCodes.find(
        bc => bc.code === backupCode && !bc.used
      );
      
      if (backupCodeEntry) {
        isBackupCodeValid = true;
        // Mark backup code as used
        backupCodeEntry.used = true;
        await user.save();
      }
    }

    // Validate token or backup code
    if (!isTokenValid && !isBackupCodeValid) {
      return res.status(400).json({ 
        message: 'Invalid two-factor authentication token' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        role: user.role,
        twoFactorVerified: true
      }, 
      config.JWT_SECRET, 
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Two-factor authentication successful',
      token
    });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ 
      message: 'Error verifying two-factor authentication', 
      error: error.message 
    });
  }
});

module.exports = router;
