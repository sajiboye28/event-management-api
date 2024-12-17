const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const config = require('../config/config');
const jwt = require('jsonwebtoken');

class OAuthService {
  // Initialize OAuth strategies
  static initStrategies() {
    // Google OAuth Strategy
    passport.use(new GoogleStrategy({
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback'
    }, this.googleVerifyCallback));

    // GitHub OAuth Strategy
    passport.use(new GithubStrategy({
      clientID: config.GITHUB_CLIENT_ID,
      clientSecret: config.GITHUB_CLIENT_SECRET,
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email']
    }, this.githubVerifyCallback));

    // Serialize user for session
    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
      try {
        const user = await User.findById(id);
        done(null, user);
      } catch (error) {
        done(error);
      }
    });
  }

  // Google OAuth Verification Callback
  static async googleVerifyCallback(
    accessToken, 
    refreshToken, 
    profile, 
    done
  ) {
    try {
      // Find or create user
      let user = await User.findOne({ 
        $or: [
          { 'contactInfo.googleId': profile.id },
          { email: profile.emails[0].value }
        ]
      });

      if (!user) {
        // Create new user
        user = new User({
          username: profile.displayName.replace(/\s+/g, '').toLowerCase(),
          email: profile.emails[0].value,
          profile: {
            firstName: profile.name.givenName,
            lastName: profile.name.familyName,
            avatar: profile.photos[0].value
          },
          contactInfo: {
            googleId: profile.id
          },
          password: this.generateRandomPassword()
        });

        await user.save();
      } else {
        // Update existing user
        user.contactInfo = user.contactInfo || {};
        user.contactInfo.googleId = profile.id;
        user.profile.avatar = profile.photos[0].value;
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }

  // GitHub OAuth Verification Callback
  static async githubVerifyCallback(
    accessToken, 
    refreshToken, 
    profile, 
    done
  ) {
    try {
      // Find or create user
      let user = await User.findOne({ 
        $or: [
          { 'contactInfo.githubId': profile.id },
          { email: profile.emails[0].value }
        ]
      });

      if (!user) {
        // Create new user
        user = new User({
          username: profile.username,
          email: profile.emails[0].value,
          profile: {
            firstName: profile.displayName.split(' ')[0],
            lastName: profile.displayName.split(' ')[1] || '',
            avatar: profile.photos[0].value
          },
          contactInfo: {
            githubId: profile.id
          },
          password: this.generateRandomPassword()
        });

        await user.save();
      } else {
        // Update existing user
        user.contactInfo = user.contactInfo || {};
        user.contactInfo.githubId = profile.id;
        user.profile.avatar = profile.photos[0].value;
        await user.save();
      }

      return done(null, user);
    } catch (error) {
      return done(error);
    }
  }

  // Generate JWT token for OAuth login
  static generateOAuthToken(user) {
    return jwt.sign(
      { 
        id: user._id, 
        username: user.username,
        role: user.role,
        oauthLogin: true
      }, 
      config.JWT_SECRET, 
      { expiresIn: '30d' }
    );
  }

  // Generate random password for OAuth users
  static generateRandomPassword() {
    return Math.random().toString(36).slice(-8);
  }
}

module.exports = OAuthService;
