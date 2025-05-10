const errorHandler = (err, req, res, next) => {
  // Determine the status code: use the response status code if set, otherwise default to 500 (Internal Server Error)
  const statusCode = res.statusCode && res.statusCode >= 400 ? res.statusCode : 500;

  res.status(statusCode);
  res.json({
    message: err.message, // The error message
    // Include stack trace only in development environment for debugging
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = { errorHandler };