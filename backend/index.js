

require('dotenv').config();

const http = require('http');
const app = require('./app'); // Your Express app
// const { Server } = require("socket.io"); // Will be used later for real-time

const port = process.env.PORT || 5001;

// Create HTTP server
const server = http.createServer(app);

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  console.log(`Access at http://localhost:${port}`);
});