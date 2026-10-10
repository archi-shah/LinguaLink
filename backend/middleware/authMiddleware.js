// middleware/authMiddleware.js — JWT Token Protection
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect — verifies JWT and attaches user to req.user
 * Usage: router.get('/route', protect, controller)
 */
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No authentication token found. Please log in.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    const user = await User.findById(decoded.id).select('-password -otp -otpExpiry');
    if (!user) {
      return res.status(401).json({ message: 'User no longer exists.' });
    }
    if (user.isBanned) {
      return res.status(403).json({ message: 'Your account has been suspended.' });
    }
    if (!user.isVerified) {
      return res.status(401).json({ message: 'Account not verified. Please complete OTP verification.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' });
    }
    return res.status(401).json({ message: 'Invalid authentication token.' });
  }
};

module.exports = { protect };
