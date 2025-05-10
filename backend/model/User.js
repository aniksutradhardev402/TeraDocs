const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define the User Schema
const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please add a name'], // Name is required
  },
  email: {
    type: String,
    required: [true, 'Please add an email'], // Email is required
    unique: true, // Email must be unique
    match: [ // Regex to validate email format
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email',
    ],
  },
  password: {
    type: String,
    required: [true, 'Please add a password'], // Password is required
    minlength: 6, // Minimum password length
    select: false, // Do not return password by default when querying users
  },
  createdAt: {
    type: Date,
    default: Date.now, // Default value is the current date/time
  },
});

// Middleware to hash password before saving a new user
// 'pre' hook runs before the 'save' operation
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified (or is new)
  if (!this.isModified('password')) {
    next();
  }

  // Generate a salt for hashing
  const salt = await bcrypt.genSalt(10);
  // Hash the password using the generated salt
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare entered password with hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create and export the User model based on the schema
const User = mongoose.model('User', userSchema);

module.exports = User;