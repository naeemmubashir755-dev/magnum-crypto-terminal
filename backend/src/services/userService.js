const prisma = require('../config/prisma');
const { createHttpError } = require('../utils/httpError');

// The selected fields prevent password hashes from ever leaving this layer.
const publicUserFields = {
  id: true,
  username: true,
  email: true,
  createdAt: true,
};

/** Database operations for Magnum users. */
class UserService {
  async createUser({ username, email, passwordHash }) {
    if (!username || !email || !passwordHash) {
      throw createHttpError(400, 'username, email, and passwordHash are required.');
    }

    return prisma.user.create({
      data: { username, email, passwordHash },
      select: publicUserFields,
    });
  }

  async getUserById(id) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: publicUserFields,
    });

    if (!user) throw createHttpError(404, 'User not found.');
    return user;
  }
}

module.exports = new UserService();
