
require('dotenv').config();

const http = require('http');
const app = require('./app');
const config = require('./config');
const { initializeSocketIO } = require('./services/socketServices');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = initializeSocketIO(server);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Start the server
server.listen(config.port, () => {
  console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
  console.log(`Access at http://localhost:${config.port}`);
});