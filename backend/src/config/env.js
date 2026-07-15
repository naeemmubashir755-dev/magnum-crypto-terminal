const dotenv = require('dotenv');

// Load environment variables before the application is configured.
dotenv.config();

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 5000,
  coinGeckoBaseUrl: process.env.COINGECKO_BASE_URL || 'https://api.coingecko.com/api/v3',
};
