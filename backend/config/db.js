const config = require('../config'); 

const mongoose = require('mongoose');

// Function to connect to MongoDB
const connectDB = async () => {
  try {
    // Attempt to connect to the MongoDB database using the URI from environment variables
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Options to avoid deprecation warnings
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Mongoose 6 always behaves as if `useCreateIndex` is true and `useFindAndModify` is false,
      // so these options are no longer necessary but don't harm.
    });

    // Log a success message if the connection is established
    console.log(`MongoDB Connected: ${conn.connection.host}`);


        if (config.nodeEnv === 'production') {
      console.log('Setting up database indexes for production...');
      // These will be created if they don't exist
      await mongoose.connection.db.collection('documents').createIndex({ owner: 1 });
      await mongoose.connection.db.collection('documents').createIndex({ 'collaborators.user': 1 });
      await mongoose.connection.db.collection('documents').createIndex({ title: 'text', content: 'text' });
    }
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};


module.exports = connectDB;