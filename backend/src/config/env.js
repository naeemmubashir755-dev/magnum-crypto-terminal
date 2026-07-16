const dotenv = require('dotenv');

// Load environment variables before the application is configured.
dotenv.config();

const requireEnvironmentValue = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

module.exports = {
  nodeEnv: requireEnvironmentValue('NODE_ENV'),
  port: Number(requireEnvironmentValue('PORT')),
  coinGeckoBaseUrl: requireEnvironmentValue('COINGECKO_BASE_URL'),
  fearGreedApiUrl: requireEnvironmentValue('FEAR_GREED_API_URL'),
  databaseUrl: requireEnvironmentValue('DATABASE_URL'),
  jwtAccessSecret: requireEnvironmentValue('JWT_ACCESS_SECRET'),
  jwtRefreshSecret: requireEnvironmentValue('JWT_REFRESH_SECRET'),
  jwtAccessExpiresIn: requireEnvironmentValue('JWT_ACCESS_EXPIRES_IN'),
  jwtRefreshExpiresIn: requireEnvironmentValue('JWT_REFRESH_EXPIRES_IN'),
};
