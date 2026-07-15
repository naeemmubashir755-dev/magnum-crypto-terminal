const bcrypt = require('bcrypt');
const userService = require('./userService');
const { createHttpError } = require('../utils/httpError');

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

/**
 * Registration orchestration. Hashing occurs here; UserService owns persistence.
 */
class AuthService {
  async register(registrationData) {
    const { username, email, password } = validateRegistration(registrationData);
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    return userService.createUser({ username, email, passwordHash });
  }
}

module.exports = new AuthService();
