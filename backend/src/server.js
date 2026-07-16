const express = require('express');
const http = require('http');
const cors = require('cors');
const { port, marketBroadcastIntervalMs } = require('./config/env');
const healthRoutes = require('./routes/healthRoutes');
const marketRoutes = require('./routes/marketRoutes');
const userRoutes = require('./routes/userRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const authRoutes = require('./routes/authRoutes');
const marketSentimentRoutes = require('./routes/marketSentimentRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { createSocketServer } = require('./socket/socketServer');
const { createMarketBroadcaster } = require('./services/marketBroadcastService');

const app = express();

// Shared HTTP middleware belongs at the application boundary.
app.use(cors());
app.use(express.json());

app.use('/api', healthRoutes);
app.use('/api', marketRoutes);
app.use('/api', marketSentimentRoutes);
app.use('/api', authRoutes);
app.use('/api', userRoutes);
app.use('/api', portfolioRoutes);
app.use('/api', watchlistRoutes);
app.use(notFound);
app.use(errorHandler);

const httpServer = http.createServer(app);
const io = createSocketServer(httpServer);
const marketBroadcaster = createMarketBroadcaster(io, {
  intervalMs: marketBroadcastIntervalMs,
});

marketBroadcaster.start();

httpServer.listen(port, () => {
  console.log(`Magnum backend listening on port ${port}.`);
});

// Close background work and active socket transports during a graceful stop.
const shutdown = () => {
  marketBroadcaster.stop();
  io.close(() => httpServer.close(() => process.exit(0)));
};

process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);

module.exports = { app, httpServer, io };
