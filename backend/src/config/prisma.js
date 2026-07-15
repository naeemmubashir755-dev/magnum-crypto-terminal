const { PrismaClient } = require('@prisma/client');

// Reuse one Prisma client during development to avoid opening excess database connections.
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;

module.exports = prisma;
