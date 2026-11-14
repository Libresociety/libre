ALTER TABLE users ADD COLUMN ip_hash TEXT;
ALTER TABLE signup_requests ADD COLUMN ip_hash TEXT;

CREATE UNIQUE INDEX users_unique_ip ON users(ip_hash) WHERE ip_hash IS NOT NULL;
CREATE UNIQUE INDEX signup_pending_unique_ip ON signup_requests(ip_hash)
  WHERE ip_hash IS NOT NULL AND status = 'pending';
