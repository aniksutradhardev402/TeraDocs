const express = require('express');
const { registerUser, loginUser } = require('../controllers/authController');

const router = express.Router();

// Route for user registration
// POST /api/auth/register
router.post('/register', registerUser);

// Route for user login
// POST /api/auth/login
router.post('/login', loginUser); // Placeholder for now

module.exports = router;