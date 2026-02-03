const User = require('../models/user.model');
const { Stats } = require('../models/stats.model');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getSignedUrl } = require('../config/gcs');
const mongoose = require('mongoose');

class AuthService {
  generateToken(userId) {
    return jwt.sign({ id: userId },
      process.env.JWT_SECRET || 'your_jwt_secret', {
      expiresIn: '1d'
    }
    );
  }

  generateRefreshToken() {
    return crypto.randomBytes(40).toString('hex');
  }

  async getProfilePictureDownloadUrl(key) {
    if (!key) return null;
    return await getSignedUrl(key);
  }

  async registerUser({ email, firstName, lastName, password }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = await User.create({
      email,
      firstName,
      lastName,
      password
    });

    await Stats.create({
      userId: new mongoose.Types.ObjectId(user._id)
    });

    return user;
  }

  async loginUser(user) {
    // Basic login logic is handled by passport, this handles post-login token generation
    const token = this.generateToken(user._id);
    const refreshToken = this.generateRefreshToken();
    const profilePictureUrl = await this.getProfilePictureDownloadUrl(user.profilePicture);

    return { token, refreshToken, profilePictureUrl };
  }

  async refreshUserToken(refreshToken) {
    if (!refreshToken) throw new Error('No refresh token');
    
    const user = await User.findOne({ refreshToken });
    if (!user) throw new Error('Invalid refresh token');

    const token = this.generateToken(user._id);
    const newRefreshToken = this.generateRefreshToken();
    const profilePictureUrl = await this.getProfilePictureDownloadUrl(user.profilePicture);
    
    user.refreshToken = newRefreshToken;
    await user.save();

    return { token, newRefreshToken, user, profilePictureUrl };
  }
}

module.exports = new AuthService();