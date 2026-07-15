# Magnum Backend

## Upstream response caching

`MarketService` caches each CoinGecko request by its complete URL for 60 seconds in process memory. A matching, unexpired entry is returned immediately; otherwise the service fetches a fresh response and stores it. Failed upstream requests are not cached, so a later request can retry normally.

The cache is intentionally local to a running backend instance. Restarting the server clears it.
