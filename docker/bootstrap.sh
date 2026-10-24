#!/usr/bin/env bash
set -euo pipefail

PG_URL_BASE="postgresql://repo_chat:repo_chat@localhost:5432"
DATABASES="auth_service repository_service chat_service"

echo "bootstrap: waiting for postgres"
until su postgres -c "pg_isready -q -h /var/run/postgresql"; do sleep 1; done

# The socket listener coming up doesn't guarantee the TCP listener (used
# below by prisma's DATABASE_URL) has too. Wait for it explicitly.
until pg_isready -q -h 127.0.0.1 -p 5432 -U postgres; do sleep 1; done

echo "bootstrap: ensuring role and databases"
su postgres -c "psql -v ON_ERROR_STOP=1 -q <<'SQL'
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'repo_chat') THEN
    CREATE ROLE repo_chat LOGIN PASSWORD 'repo_chat';
  END IF;
END
\$\$;
SQL"
for db in $DATABASES; do
  su postgres -c "psql -tAc \"SELECT 1 FROM pg_database WHERE datname='$db'\"" | grep -q 1 \
    || su postgres -c "psql -q -c \"CREATE DATABASE $db OWNER repo_chat\""
done

PRISMA=/app/node_modules/.bin/prisma

echo "bootstrap: running prisma migrations"
( cd /app/apps/auth-service       && DATABASE_URL="$PG_URL_BASE/auth_service"       "$PRISMA" migrate deploy --config prisma7.config.ts )
( cd /app/apps/repository-service && DATABASE_URL="$PG_URL_BASE/repository_service" "$PRISMA" migrate deploy --config prisma7.config.ts )
( cd /app/apps/chat-service       && DATABASE_URL="$PG_URL_BASE/chat_service"       "$PRISMA" migrate deploy --config prisma7.config.ts )

echo "bootstrap: waiting for clickhouse"
until clickhouse client --password repo_chat --query "SELECT 1" >/dev/null 2>&1; do sleep 1; done
clickhouse client --password repo_chat --query "CREATE DATABASE IF NOT EXISTS repository_service"

echo "bootstrap: waiting for kafka"
until /opt/kafka/bin/kafka-broker-api-versions.sh --bootstrap-server localhost:9092 >/dev/null 2>&1; do sleep 2; done
/opt/kafka/bin/kafka-topics.sh --bootstrap-server localhost:9092 \
  --create --if-not-exists --topic repo-chat-logs --partitions 1 --replication-factor 1

touch /run/bootstrap.done
echo "bootstrap: app services unblocked"
