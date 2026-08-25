CREATE TABLE IF NOT EXISTS post_views (
  post_id TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  first_viewed_at TEXT NOT NULL,
  PRIMARY KEY (post_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS post_views_post_idx
  ON post_views (post_id);
