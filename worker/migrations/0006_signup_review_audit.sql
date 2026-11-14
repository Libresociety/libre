ALTER TABLE signup_requests ADD COLUMN decided_at TEXT;
ALTER TABLE signup_requests ADD COLUMN decided_by TEXT REFERENCES users(id);
