#!/usr/bin/env bash
set -euo pipefail

# Runs once, at image build time, so a fresh container is immediately usable
# instead of waiting through migrations and table creation on first boot.
# Postgres/ClickHouse/Kafka data ends up at paths the Dockerfile later
# declares as VOLUME, so Docker auto-seeds any fresh named volume with this
# baked state on first `docker run`. An existing volume is left untouched.

PG_BIN=/usr/lib/postgresql/16/bin
PGDATA=/data/postgresql
# 127.0.0.1 (not "localhost") so Prisma's query engine connects over IPv4 and
# never tries an ::1 that may not be bound; connect_timeout covers slow starts.
PG_URL_BASE="postgresql://repo_chat:repo_chat@127.0.0.1:5432"
PG_URL_SUFFIX="?connect_timeout=60"
DATABASES="auth_service repository_service chat_service"

migrate() {
  local dir="$1" url="$2" attempt
  for attempt in 1 2 3; do
    ( cd "$dir" && DATABASE_URL="$url" "$PRISMA" migrate deploy --config prisma7.config.ts ) && return 0
    echo "seed: migrate $dir failed (attempt $attempt), retrying" >&2
    sleep 3
  done
  return 1
}

mkdir -p /data/postgresql /data/clickhouse/tmp /data/clickhouse/user_files /data/clickhouse/format_schemas /data/kafka
chown -R postgres:postgres /data/postgresql
chown -R clickhouse:clickhouse /data/clickhouse
mkdir -p /var/run/postgresql
chown postgres:postgres /var/run/postgresql

echo "seed: initializing postgres cluster"
su postgres -c "$PG_BIN/initdb -D $PGDATA --auth-local=peer --auth-host=scram-sha-256 --username=postgres"
{
  echo "listen_addresses = 'localhost'"
  echo "unix_socket_directories = '/var/run/postgresql'"
} >>"$PGDATA/postgresql.conf"
{
  echo "host all all 127.0.0.1/32 scram-sha-256"
  echo "host all all ::1/128 scram-sha-256"
} >>"$PGDATA/pg_hba.conf"

echo "seed: starting postgres"
su postgres -c "$PG_BIN/pg_ctl -D $PGDATA -l /tmp/postgres-seed.log -w start"

# `pg_ctl -w` only waits for the unix-socket listener; the TCP listener (used
# below by prisma's DATABASE_URL) can bind a moment later, especially under
# the CPU contention of a multi-platform build. Wait for it explicitly.
until pg_isready -h 127.0.0.1 -p 5432 -U postgres >/dev/null 2>&1; do sleep 1; done

echo "seed: creating role and databases"
su postgres -c "psql -v ON_ERROR_STOP=1 -q -c \"CREATE ROLE repo_chat LOGIN PASSWORD 'repo_chat'\""
for db in $DATABASES; do
  su postgres -c "psql -q -c \"CREATE DATABASE $db OWNER repo_chat\""
done

PRISMA=/app/node_modules/.bin/prisma

echo "seed: running prisma migrations"
migrate /app/apps/auth-service       "$PG_URL_BASE/auth_service$PG_URL_SUFFIX"
migrate /app/apps/repository-service "$PG_URL_BASE/repository_service$PG_URL_SUFFIX"
migrate /app/apps/chat-service       "$PG_URL_BASE/chat_service$PG_URL_SUFFIX"

echo "seed: stopping postgres"
su postgres -c "$PG_BIN/pg_ctl -D $PGDATA -m fast -w stop"

echo "seed: starting clickhouse"
su -s /bin/bash clickhouse -c "/usr/local/bin/clickhouse server --config-file=/etc/clickhouse-server/config.xml" \
  >/tmp/clickhouse-seed.log 2>&1 &
CH_PID=$!
until clickhouse client --password repo_chat --query "SELECT 1" >/dev/null 2>&1; do sleep 1; done

echo "seed: creating clickhouse database and log table"
clickhouse client --password repo_chat --query "CREATE DATABASE IF NOT EXISTS repository_service"
clickhouse client --password repo_chat --query "
CREATE TABLE IF NOT EXISTS log_events (
  event_id UUID,
  timestamp DateTime MATERIALIZED now(),
  repository_id String,
  user_id String,
  log String,
  metadata Nullable(String)
)
ENGINE=MergeTree PARTITION BY toYYYYMM(timestamp)
ORDER BY (timestamp)"

echo "seed: stopping clickhouse"
kill "$CH_PID"
wait "$CH_PID" 2>/dev/null || true

echo "seed: formatting kafka storage"
CLUSTER_ID="$(/opt/kafka/bin/kafka-storage.sh random-uuid)"
/opt/kafka/bin/kafka-storage.sh format -t "$CLUSTER_ID" -c /etc/kafka/server.properties --ignore-formatted

echo "seed: complete"
