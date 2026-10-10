const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
    const userRole = req.user?.role;
    if (userRole !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }
    next();
  } catch (error) {
    console.error('Error in isAdmin middleware:', error);
    res.status(500).json({ message: 'Server error authorizing admin access.' });
  }
};

module.exports = { isAdmin };
