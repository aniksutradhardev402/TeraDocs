const User = require('../model/User');
const jwt = require('jsonwebtoken'); // Will be used for login
const config = require('../config'); // To access JWT_SECRET



const generateToken = (id) => {
  return jwt.sign({ id }, config.jwtSecret, { // Use config.jwtSecret
    expiresIn: '30d', // Token expiration (e.g., 30 days)
  });
};
// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public


const registerUser = async (req, res, next) => {
   const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      res.status(400);
      throw new Error('Please provide name, email, and password');
    }

    const userExists = await User.findOne({ email });
    if (userExists) {
      res.status(400);
      throw new Error('User already exists with this email');
    }

    const user = await User.create({
      name,
      email,
      password,
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id), // Also generate token on successful registration
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res, next) => {
    const { email, password } = req.body;

  try {
    // 1. Check if email and password are provided
    if (!email || !password) {
      res.status(400); // Bad Request
      throw new Error('Please provide email and password');
    }

    // 2. Check if user exists by email
    //    We need to explicitly select the password field as it's set to 'select: false' in the schema
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      res.status(401); // Unauthorized
      throw new Error('Invalid credentials (email not found)');
    }

    // 3. If user exists, compare entered password with the stored hashed password
    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      res.status(401); // Unauthorized
      throw new Error('Invalid credentials (password incorrect)');
    }

    // 4. If passwords match, user is authenticated. Send back user info and JWT.
    res.status(200).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });

  } catch (error) {
    next(error); // Pass error to the global error handler
  }
};

// Helper function to generate JWT (typically used in login)
// const generateToken = (id) => {
//   return jwt.sign({ id }, config.jwtSecret, {
//     expiresIn: '30d', // Token expiration
//   });
// };

module.exports = {
  registerUser,
  loginUser,
};