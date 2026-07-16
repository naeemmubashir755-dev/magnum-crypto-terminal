const { Server } = require('socket.io');
const { socketCorsOrigin } = require('../config/env');

/**
 * Attaches Socket.IO to the existing HTTP server. REST routing remains owned
 * by Express, while Socket.IO handles its own upgrade endpoint.
 */
const createSocketServer = (httpServer) => new Server(httpServer, {
  cors: {
    origin: socketCorsOrigin,
    methods: ['GET', 'POST'],
  },
});

module.exports = { createSocketServer };
