require('dotenv').config();

const config = {
  port: process.env.PORT || 5001,
    nodeEnv: process.env.NODE_ENV || 'development',
  mongoURI: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  // Add other configurations as needed

  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  
  // CORS
  corsOrigin: process.env.CORS_ORIGIN || '*',
  
  // Rate Limiting
  rateLimit: {
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX || 100 // Limit each IP to 100 requests per windowMs
  },
  
  // Document Settings
  maxVersionHistory: process.env.MAX_VERSION_HISTORY || 50,
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info'
};


// Validate that JWT_SECRET is set
if (!config.jwtSecret) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in .env file.");
  process.exit(1);
}

module.exports = config;