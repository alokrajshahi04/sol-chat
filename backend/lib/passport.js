/**
 * Passport.js OAuth configuration for Google
 */

const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');

/**
 * Initialize Passport with OAuth strategies
 * @param {Object} config - Environment configuration
 */
function initializePassport(config) {
  // Serialize user to session
  passport.serializeUser((user, done) => {
    done(null, user._id);
  });

  // Deserialize user from session
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });

  // Google OAuth Strategy
  if (config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.GOOGLE_CLIENT_ID,
          clientSecret: config.GOOGLE_CLIENT_SECRET,
          callbackURL: config.GOOGLE_CALLBACK_URL,
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const user = await findOrCreateOAuthUser({
              provider: 'google',
              providerId: profile.id,
              email: profile.emails?.[0]?.value,
              name: profile.displayName,
              avatar: profile.photos?.[0]?.value,
            });
            done(null, user);
          } catch (error) {
            done(error, null);
          }
        }
      )
    );
    console.log('Google OAuth strategy initialized');
  }

  return passport;
}

/**
 * Find or create a user from OAuth data
 * @param {Object} data - OAuth user data
 * @returns {Promise<User>} - User document
 */
async function findOrCreateOAuthUser({ provider, providerId, email, name, avatar }) {
  // First try to find by OAuth provider and ID
  let user = await User.findOne({
    oauthProvider: provider,
    oauthId: providerId,
  });

  if (user) {
    // Update profile info if changed
    let needsUpdate = false;
    
    if (name && user.name !== name) {
      user.name = name;
      needsUpdate = true;
    }
    
    if (avatar && user.avatar !== avatar) {
      user.avatar = avatar;
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      await user.save();
    }
    
    return user;
  }

  // Check if user exists with same email (link accounts)
  if (email) {
    user = await User.findOne({ email });
    
    if (user) {
      // Link OAuth provider to existing account
      if (user.oauthProvider === 'local') {
        user.oauthProvider = provider;
        user.oauthId = providerId;
        if (name) user.name = name;
        if (avatar) user.avatar = avatar;
        await user.save();
        return user;
      }
    }
  }

  // Create new user
  user = new User({
    email,
    oauthProvider: provider,
    oauthId: providerId,
    name,
    avatar,
  });

  await user.save();
  return user;
}

module.exports = { initializePassport, findOrCreateOAuthUser };

