-- Real, honest counters shown on the home page.
-- visits  = unique visitors per day, added up (a person coming back tomorrow counts again)
-- posters = posters shared or saved from the poster maker
CREATE TABLE stats (
  key   TEXT PRIMARY KEY,
  value INTEGER NOT NULL
);
INSERT INTO stats (key, value) VALUES ('visits', 0), ('posters', 0);

-- today's visitors (salted IP hashes), only to avoid counting the same person twice a day
CREATE TABLE visitor_days (
  day     TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  PRIMARY KEY (day, ip_hash)
);

-- posters made per person per day, to cap how much one phone can add
CREATE TABLE poster_days (
  day     TEXT NOT NULL,
  ip_hash TEXT NOT NULL,
  n       INTEGER NOT NULL,
  PRIMARY KEY (day, ip_hash)
);
