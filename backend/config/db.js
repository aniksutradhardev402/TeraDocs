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
  } catch (error) {
    // Log an error message and exit the process if the connection fails
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;