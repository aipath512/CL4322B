-- Eva FTS5 / D1 V1: non-destructive schema. Source of truth: functions/api/_knowledge.js
-- Apply once via wrangler before loading generated data.
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  val TEXT NOT NULL
);
CREATE VIRTUAL TABLE IF NOT EXISTS k USING fts5(
  q, body,
  tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TABLE IF NOT EXISTS ab_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  q TEXT NOT NULL,
  idf_top TEXT,
  fts_top TEXT,
  same INTEGER NOT NULL CHECK(same IN (0,1))
);
CREATE INDEX IF NOT EXISTS idx_ab_log_ts ON ab_log(ts);
