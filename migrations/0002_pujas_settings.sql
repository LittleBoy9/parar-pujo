-- Pujas sent in by visitors ("আপনার পাড়ার পুজো যোগ করুন"). Shown on the site once approved.
CREATE TABLE puja_submissions (
  id          TEXT PRIMARY KEY,
  name_bn     TEXT NOT NULL,
  name_en     TEXT,
  area_bn     TEXT NOT NULL,
  theme_bn    TEXT,
  map_url     TEXT,
  submitter   TEXT,
  media_key   TEXT NOT NULL,
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | live | rejected
  ip_hash     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  reviewed_at INTEGER,
  reviewed_by TEXT
);
CREATE INDEX puja_status ON puja_submissions (status, reviewed_at);
CREATE INDEX puja_ip ON puja_submissions (ip_hash, created_at);

-- Small key/value store (e.g. which Telegram chat receives approval requests).
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
