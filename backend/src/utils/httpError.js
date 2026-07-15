/**
 * Creates an error that the shared Express error middleware can translate into
 * a safe HTTP response.
 */
const createHttpError = (statusCode, message) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

module.exports = { createHttpError };
