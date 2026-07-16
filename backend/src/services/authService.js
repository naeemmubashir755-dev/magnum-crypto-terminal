const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');
const userService = require('./userService');
const refreshTokenService = require('./refreshTokenService');
const { createHttpError } = require('../utils/httpError');
const {
  jwtAccessSecret,
  jwtRefreshSecret,
  jwtAccessExpiresIn,
  jwtRefreshExpiresIn,
} = require('../config/env');

const BCRYPT_ROUNDS = 12;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalizes and validates registration input before any database work occurs.
 */
const validateRegistration = ({ username, email, password } = {}) => {
  const normalizedUsername = typeof username === 'string' ? username.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  const errors = [];

  if (normalizedUsername.length < 3 || normalizedUsername.length > 30) {
    errors.push('username must be between 3 and 30 characters.');
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    errors.push('email must be a valid email address.');
  }

  if (typeof password !== 'string' || password.length < 8) {
    errors.push('password must be at least 8 characters.');
  }

  if (errors.length > 0) {
    throw createHttpError(400, `Registration failed: ${errors.join(' ')}`);
  }

  return { username: normalizedUsername, email: normalizedEmail, password };
};

const validateLogin = ({ email, password } = {}) => {
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!EMAIL_PATTERN.test(normalizedEmail) || typeof password !== 'string' || !password) {
    throw createHttpError(400, 'email and password are required.');
  }

  return { email: normalizedEmail, password };
};

/** Issues a short-lived access token and a separately signed refresh token. */
const createTokenPair = async (user) => {
  const accessToken = jwt.sign(
    { username: user.username, tokenType: 'access' },
    jwtAccessSecret,
    { subject: user.id, expiresIn: jwtAccessExpiresIn },
  );
  const refreshToken = jwt.sign(
    { tokenType: 'refresh', jti: randomUUID() },
    jwtRefreshSecret,
    { subject: user.id, expiresIn: jwtRefreshExpiresIn },
  );
  const { exp } = jwt.decode(refreshToken);

  await refreshTokenService.create({
    userId: user.id,
    tokenHash: await bcrypt.hash(refreshToken, BCRYPT_ROUNDS),
    expiresAt: new Date(exp * 1000),
  });

  return { accessToken, refreshToken };
};

/**
 * Registration orchestration. Hashing occurs here; UserService owns persistence.
 */
class AuthService {
  async register(registrationData) {
    const { username, email, password } = validateRegistration(registrationData);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    return userService.createUser({ username, email, passwordHash });
  }

  async login(loginData) {
    const { email, password } = validateLogin(loginData);
    const user = await userService.getUserForAuthenticationByEmail(email);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw createHttpError(401, 'Invalid email or password.');
    }

    return createTokenPair(user);
  }
}

module.exports = new AuthService();
