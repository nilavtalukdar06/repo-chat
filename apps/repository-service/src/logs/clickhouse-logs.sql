CREATE TABLE log_events (
  event_id UUID,
  timestamp DateTime MATERIALIZED now(),
  repository_id String,
  user_id String,
  log String,
  metadata Nullable(String)
)
ENGINE=MergeTree PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp);
