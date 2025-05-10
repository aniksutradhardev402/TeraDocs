

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const connectDB = require('./config/db');
const config = require('./config');
const { errorHandler } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');

const app = express();

connectDB();


app.use(cors({
  origin: config.corsOrigin === '*' ? '*' : config.corsOrigin.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

app.use(helmet());

// Limit requests from same IP
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes by default
  max: config.rateLimit.max, // Limit each IP to 100 requests per window by default
  message: 'Too many requests from this IP, please try again later'
});
app.use('/api', limiter);
// Body Parser Middleware
// To parse JSON request bodies
app.use(express.json());
// To parse URL-encoded request bodies
app.use(express.urlencoded({ extended: false }));





app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp());

// Compression middleware to reduce response size
app.use(compression());



app.get('/', (req, res) => {
  res.send('Google Docs Clone API is running...');
});

app.use('/api/auth', authRoutes);
// Document routes
app.use('/api/documents', documentRoutes)
// Search routes
app.use('/api/search', searchRoutes);




// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(errorHandler);

module.exports = app;