const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const User = require('../models/User');

class TwoFactorService {
  // Generate 2FA secret
  static generateSecret(username) {
    return speakeasy.generateSecret({
      name: `EventManagementAPI:${username}`,
      length: 32
    });
  }

  // Generate QR code for 2FA setup
  static async generateQRCode(secret) {
    return new Promise((resolve, reject) => {
      QRCode.toDataURL(secret.otpauth_url, (err, data_url) => {
        if (err) reject(err);
        resolve(data_url);
      });
    });
  }

  // Verify 2FA token
  static verifyToken(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token
    });
  }

  // Enable 2FA for user
  static async enableTwoFactor(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      // Generate and save 2FA secret
      const secret = this.generateSecret(user.username);
      
      user.twoFactorSecret = secret.base32;
      user.twoFactorEnabled = true;
      
      await user.save();

      // Generate QR code
      const qrCode = await this.generateQRCode(secret);

      return {
        secret: secret.base32,
        qrCode: qrCode
      };
    } catch (error) {
      console.error('Two-factor setup error:', error);
      throw error;
    }
  }

  // Disable 2FA for user
  static async disableTwoFactor(userId) {
    try {
      const user = await User.findById(userId);
      
      if (!user) {
        throw new Error('User not found');
      }

      user.twoFactorSecret = undefined;
      user.twoFactorEnabled = false;
      
      await user.save();

      return true;
    } catch (error) {
      console.error('Two-factor disable error:', error);
      throw error;
    }
  }

  // Generate backup codes
  static generateBackupCodes(count = 5) {
    const backupCodes = [];
    for (let i = 0; i < count; i++) {
      // Generate a 8-digit backup code
      const code = Math.floor(10000000 + Math.random() * 90000000).toString();
      backupCodes.push({
        code: code,
        used: false,
        createdAt: new Date()
      });
    }
    return backupCodes;
  }
}

module.exports = TwoFactorService;
