// Return a consistent JSON response for routes that do not exist yet.
const notFound = (request, response) => {
  response.status(404).json({
    status: 'error',
    message: `Route ${request.method} ${request.originalUrl} was not found.`,
  });
};

// Forward upstream API failures as safe, consistent JSON responses.
const errorHandler = (error, request, response, next) => {
  console.error(error);
  response.status(error.statusCode || 500).json({
    status: 'error',
    message: error.message || 'The server could not complete this request.',
  });
};

module.exports = { notFound, errorHandler };
