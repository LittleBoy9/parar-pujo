-- Stories: visitor photos tied to a pandal. Nothing is shown until an approver says so,
-- and everything is gone 24 hours after approval.
CREATE TABLE stories (
  id          TEXT PRIMARY KEY,
  pandal      TEXT NOT NULL,
  media_key   TEXT NOT NULL,
  caption     TEXT,
  author      TEXT,
  width       INTEGER NOT NULL,
  height      INTEGER NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending | live | hidden | rejected
  reports     INTEGER NOT NULL DEFAULT 0,
  ip_hash     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,                -- epoch ms
  reviewed_at INTEGER,
  reviewed_by TEXT,
  expires_at  INTEGER                          -- set on approval
);
CREATE INDEX stories_live ON stories (status, expires_at);
CREATE INDEX stories_ip ON stories (ip_hash, created_at);

-- One report per person per story; enough reports hides a story until re-reviewed.
CREATE TABLE story_reports (
  story_id   TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (story_id, ip_hash)
);

-- ভিড়-মিটার: each person's latest crowd reading per pandal (1 = ফাঁকা, 2 = মাঝারি, 3 = ঠাসা ভিড়).
CREATE TABLE crowd_votes (
  pandal     TEXT NOT NULL,
  ip_hash    TEXT NOT NULL,
  level      INTEGER NOT NULL CHECK (level BETWEEN 1 AND 3),
  created_at INTEGER NOT NULL,
  PRIMARY KEY (pandal, ip_hash)
);
CREATE INDEX crowd_recent ON crowd_votes (created_at);

-- Uploads accepted per IST day, for the hard daily cap.
CREATE TABLE upload_days (
  day   TEXT PRIMARY KEY,
  count INTEGER NOT NULL
);
