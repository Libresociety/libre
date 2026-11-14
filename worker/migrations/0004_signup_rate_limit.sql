CREATE TABLE IF NOT EXISTS signup_rate_limits (
  ip_hash TEXT PRIMARY KEY NOT NULL,
  window_started_at INTEGER NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0)
);
