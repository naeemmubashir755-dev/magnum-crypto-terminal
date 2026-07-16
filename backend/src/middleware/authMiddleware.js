const jwt = require('jsonwebtoken');
const { jwtAccessSecret } = require('../config/env');

const unauthorized = (response, message = 'Authentication is required.') => {
  response.status(401).json({ status: 'error', message });
};

/**
 * Verifies Bearer access tokens and exposes their trusted claims as request.auth.
 * This middleware deliberately rejects refresh tokens on application routes.
 */
const requireAuth = (request, response, next) => {
  const [scheme, token] = (request.get('authorization') || '').split(' ');

  if (scheme !== 'Bearer' || !token) {
    return unauthorized(response);
  }

  try {
    const payload = jwt.verify(token, jwtAccessSecret);
    if (payload.tokenType !== 'access' || !payload.sub) {
      return unauthorized(response, 'A valid access token is required.');
    }

    request.auth = { userId: payload.sub, username: payload.username };
    return next();
  } catch (error) {
    return unauthorized(response, 'Your access token is invalid or has expired.');
  }
};

/** Reusable guard for legacy routes that include the current user's ID. */
const requireCurrentUser = (parameterName) => (request, response, next) => {
  if (request.params[parameterName] !== request.auth.userId) {
    return unauthorized(response, 'You are not authorized to access this resource.');
  }

  return next();
};

module.exports = { requireAuth, requireCurrentUser };
