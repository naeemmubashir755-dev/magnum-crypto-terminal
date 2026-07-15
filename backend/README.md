# Magnum Backend

## Upstream response caching

`MarketService` caches each CoinGecko request by its complete URL for 60 seconds in process memory. A matching, unexpired entry is returned immediately; otherwise the service fetches a fresh response and stores it. Failed upstream requests are not cached, so a later request can retry normally.

The cache is intentionally local to a running backend instance. Restarting the server clears it.

## Database layer

Prisma models for users, portfolios, holdings, watchlists, and watchlist coins live in `prisma/schema.prisma`. Configure PostgreSQL with `DATABASE_URL` in `.env` (use `.env.example` as a template), then run `npm run prisma:generate` and `npm run prisma:migrate` when a PostgreSQL database is available.
