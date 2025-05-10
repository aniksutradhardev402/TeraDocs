const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config');

// Middleware to protect routes that require authentication
const isAuthenticated = async (req, res, next) => {
  let token;

  // Check if the authorization header exists and starts with 'Bearer'
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header (e.g., "Bearer <token>")
      token = req.headers.authorization.split(' ')[1];

      // Verify token using the JWT secret
      const decoded = jwt.verify(token, config.jwtSecret);

      // Get user from the token payload (ID) and attach to request object
      // Exclude password from the user object fetched
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
          res.status(401); // Unauthorized
          throw new Error('Not authorized, user not found');
      }

      next(); // Proceed to the next middleware or route handler
    } catch (error) {
      console.error('Token verification failed:', error.message);
      res.status(401); // Unauthorized
      // Send a more generic message in production
      next(new Error(process.env.NODE_ENV === 'production' ? 'Not authorized, token failed' : `Not authorized, token failed: ${error.message}`));
    }
  }

  if (!token) {
    res.status(401); // Unauthorized
    next(new Error('Not authorized, no token'));
  }
};

module.exports = { isAuthenticated };