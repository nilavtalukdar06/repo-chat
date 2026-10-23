#!/usr/bin/env bash
set -euo pipefail

PG_BIN=/usr/lib/postgresql/16/bin
PGDATA=/data/postgresql

if [ -z "${OPENAI_API_KEY:-}" ]; then
  echo "entrypoint: OPENAI_API_KEY is required (pass it with -e OPENAI_API_KEY=...)" >&2
  exit 1
fi
if [ -z "${AI_GATEWAY_API_KEY:-}" ]; then
  echo "entrypoint: AI_GATEWAY_API_KEY is required (pass it with -e AI_GATEWAY_API_KEY=...)" >&2
  exit 1
fi

: "${PUBLIC_URL:=http://localhost:3000}"
export PUBLIC_URL OPENAI_API_KEY AI_GATEWAY_API_KEY

mkdir -p /data/postgresql /data/redis /data/clickhouse /data/kafka /data/qdrant /data/docker
chown -R postgres:postgres /data/postgresql
chown -R clickhouse:clickhouse /data/clickhouse 2>/dev/null || true

if [ -z "${SESSION_SECRET:-}" ]; then
  if [ -f /data/session_secret ]; then
    SESSION_SECRET="$(cat /data/session_secret)"
  else
    SESSION_SECRET="$(head -c 48 /dev/urandom | base64 | tr -d '\n=')"
    printf '%s' "$SESSION_SECRET" >/data/session_secret
  fi
fi
export SESSION_SECRET

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "entrypoint: initializing postgres cluster"
  su postgres -c "$PG_BIN/initdb -D $PGDATA --auth-local=peer --auth-host=scram-sha-256 --username=postgres"
  {
    echo "listen_addresses = 'localhost'"
    echo "unix_socket_directories = '/var/run/postgresql'"
  } >>"$PGDATA/postgresql.conf"
  {
    echo "host all all 127.0.0.1/32 scram-sha-256"
    echo "host all all ::1/128 scram-sha-256"
  } >>"$PGDATA/pg_hba.conf"
fi
mkdir -p /var/run/postgresql
chown postgres:postgres /var/run/postgresql

if [ ! -f /data/kafka/meta.properties ]; then
  echo "entrypoint: formatting kafka storage"
  CLUSTER_ID="$(/opt/kafka/bin/kafka-storage.sh random-uuid)"
  /opt/kafka/bin/kafka-storage.sh format -t "$CLUSTER_ID" -c /etc/kafka/server.properties --ignore-formatted
fi

rm -f /run/bootstrap.done

echo "entrypoint: starting supervisor"
exec supervisord -c /etc/supervisor/supervisord.conf
