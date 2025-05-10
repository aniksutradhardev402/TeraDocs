require('dotenv').config();

const config = {
  port: process.env.PORT || 5001,
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  // Add other configurations as needed
};


// Validate that JWT_SECRET is set
if (!config.jwtSecret) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}

module.exports = config;