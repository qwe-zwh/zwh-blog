CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id TEXT NOT NULL,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL,
  ip_hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS comments_post_created_idx
  ON comments (post_id, created_at);

CREATE INDEX IF NOT EXISTS comments_ip_created_idx
  ON comments (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS likes (
  post_id TEXT NOT NULL,
  visitor_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, visitor_hash)
);

CREATE INDEX IF NOT EXISTS likes_post_idx
  ON likes (post_id);
