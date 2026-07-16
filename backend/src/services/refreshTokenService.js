const prisma = require('../config/prisma');

/** Persists hashed refresh tokens without ever storing the bearer token itself. */
class RefreshTokenService {
  async create({ userId, tokenHash, expiresAt }) {
    return prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });
  }
}

module.exports = new RefreshTokenService();
