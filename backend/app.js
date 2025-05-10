
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes.js');


const { errorHandler } = require('./middleware/errorHandler');



const app = express();

connectDB();


app.use(cors()); // For development, allows all origins. Restrict in production.
// Body Parser Middleware
// To parse JSON request bodies
app.use(express.json());
// To parse URL-encoded request bodies
app.use(express.urlencoded({ extended: false }));


app.get('/', (req, res) => {
  res.send('API is running...');
});


app.use('/api/auth', authRoutes);

app.use(errorHandler);

module.exports = app;