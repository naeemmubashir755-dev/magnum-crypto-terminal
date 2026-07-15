// Return a consistent JSON response for routes that do not exist yet.
const notFound = (request, response) => {
  response.status(404).json({
    status: 'error',
    message: `Route ${request.method} ${request.originalUrl} was not found.`,
  });
};

module.exports = { notFound };
