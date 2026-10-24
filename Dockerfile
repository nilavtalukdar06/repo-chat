# syntax=docker/dockerfile:1.7

FROM node:24-bookworm AS builder

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile

# auth/repository/chat-service intentionally don't depend on `prisma` (see
# the deploy step below for why); generate against one shared install instead.
RUN npm install "prisma@7.10.1" --no-save

ENV DATABASE_URL="postgresql://u:p@localhost:5432/db"
RUN cd apps/auth-service && /app/node_modules/.bin/prisma generate --config prisma7.config.ts
RUN cd apps/repository-service && /app/node_modules/.bin/prisma generate --config prisma7.config.ts
RUN cd apps/chat-service && /app/node_modules/.bin/prisma generate --config prisma7.config.ts

RUN printf 'VITE_API_URL=\n' > apps/frontend/.env.production
# Build each service directly with pnpm rather than via turbo: turbo's Rust
# binary (daemon + .turbo log dirs) hits unretried EINTR under QEMU during
# cross-arch (amd64-on-arm64) builds, and its cache buys nothing in a
# one-shot Docker build anyway. pnpm runs these in topological order.
RUN pnpm --filter auth-service --filter repository-service \
         --filter chat-service --filter api-gateway --filter frontend \
         run build

# Prune each service to a self-contained, production-only directory instead
# of shipping the whole monorepo (source, devDependencies, every other
# workspace's node_modules) into the runtime image.
RUN pnpm --filter auth-service deploy --prod --legacy /tmp/deploy/auth-service && \
    pnpm --filter repository-service deploy --prod --legacy /tmp/deploy/repository-service && \
    pnpm --filter chat-service deploy --prod --legacy /tmp/deploy/chat-service && \
    pnpm --filter api-gateway deploy --prod --legacy /tmp/deploy/api-gateway

# @prisma/client pulls in `prisma` as a peer dependency, which drags in its
# Studio and local-dev-database tooling even though none of these services
# ever use either -- confirmed unused by any application source. Strip it.
RUN find /tmp/deploy/*/node_modules/.pnpm -maxdepth 1 \( \
      -iname "@prisma+studio-core@*" -o \
      -iname "@prisma+dev@*" -o \
      -iname "@electric-sql+pglite*" -o \
      -iname "effect@*" -o \
      -iname "@typescript+typescript-*" -o \
      -iname "remeda@*" -o \
      -iname "elkjs@*" -o \
      -iname "fast-check@*" \
    \) -exec rm -rf {} +


# ---------------------------------------------------------------------------
# Indexer image, built once here instead of at every container boot. No
# secrets are baked in: repository-service injects OPENAI_API_KEY and the
# rest of the shared config as container-launch overrides, so this stage's
# .env is just an inert placeholder satisfying startup validation.
# ---------------------------------------------------------------------------
FROM ubuntu:24.04 AS indexer

RUN apt-get update && \
    apt-get install -y --no-install-recommends curl git ca-certificates && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    apt-get purge -y curl && apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /home/app

COPY apps/indexing-service/main.sh ./
COPY apps/indexing-service/src ./src
COPY apps/indexing-service/prisma ./prisma
COPY apps/indexing-service/prisma7.config.ts ./
COPY apps/indexing-service/package*.json ./
COPY apps/indexing-service/tsconfig.json ./
COPY apps/indexing-service/tsup.config.ts ./

RUN : >ca.pem && \
    printf 'NODE_ENV=production\nDATABASE_URL=postgresql://repo_chat:repo_chat@localhost:5432/repository_service\nKAFKA_BROKER=localhost:9092\nKAFKA_SSL=false\nKAFKA_SASL=false\nQDRANT_URL=http://localhost:6333\nOPENAI_API_KEY=placeholder\n' >.env

RUN npm pkg delete devDependencies.@repo/eslint-config devDependencies.@repo/typescript-config && \
    npm install && \
    npx prisma generate && \
    npm run build && \
    npm prune --omit=dev && \
    chmod +x main.sh

ENTRYPOINT [ "./main.sh" ]


# ---------------------------------------------------------------------------
# Runtime: every dependency (Postgres, Redis, ClickHouse, Kafka, Qdrant),
# the Docker daemon for sibling indexing containers, and the 4 Node services.
# ---------------------------------------------------------------------------
FROM ubuntu:24.04 AS runtime

ARG TARGETARCH
ARG KAFKA_VERSION=3.9.0
ARG SCALA_VERSION=2.13
ARG QDRANT_VERSION=1.12.4

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg bash supervisor \
      postgresql-16 postgresql-client-16 \
      redis-server \
      docker.io \
      default-jre-headless && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    rm -rf /var/lib/apt/lists/*

# ClickHouse ships a single self-contained static binary; the apt repo's
# GPG key path changes too often to depend on, so install the binary directly.
RUN curl -fsSL https://clickhouse.com/ | sh && \
    mv ./clickhouse /usr/local/bin/clickhouse && \
    chmod +x /usr/local/bin/clickhouse && \
    /usr/local/bin/clickhouse --version && \
    useradd --system --no-create-home --shell /usr/sbin/nologin clickhouse

RUN curl -fsSL "https://archive.apache.org/dist/kafka/${KAFKA_VERSION}/kafka_${SCALA_VERSION}-${KAFKA_VERSION}.tgz" -o /tmp/kafka.tgz && \
    mkdir -p /opt/kafka && \
    tar -xzf /tmp/kafka.tgz -C /opt/kafka --strip-components=1 && \
    rm /tmp/kafka.tgz

# Qdrant only publishes a gnu build for x86_64; arm64 is musl-only (statically
# linked, so it runs fine on this glibc base).
RUN case "${TARGETARCH}" in \
      amd64) QDRANT_ASSET="qdrant-x86_64-unknown-linux-gnu.tar.gz" ;; \
      arm64) QDRANT_ASSET="qdrant-aarch64-unknown-linux-musl.tar.gz" ;; \
      *) echo "unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
    esac && \
    curl -fsSL "https://github.com/qdrant/qdrant/releases/download/v${QDRANT_VERSION}/${QDRANT_ASSET}" -o /tmp/qdrant.tar.gz && \
    tar -xzf /tmp/qdrant.tar.gz -C /usr/local/bin && \
    rm /tmp/qdrant.tar.gz

WORKDIR /app
COPY --from=builder /tmp/deploy/auth-service apps/auth-service
COPY --from=builder /tmp/deploy/repository-service apps/repository-service
COPY --from=builder /tmp/deploy/chat-service apps/chat-service
COPY --from=builder /tmp/deploy/api-gateway apps/api-gateway
COPY --from=builder /app/apps/frontend/dist apps/frontend/dist

# A single shared prisma CLI for the 3 Postgres-backed services' migrate
# commands, instead of a separate copy (and separate query-engine binaries)
# bundled into each one. Node's module resolution walks up from
# apps/<service> to this directory, so `prisma/config` still resolves.
RUN npm install "prisma@7.10.1" --no-save

COPY docker/config/kafka/server.properties /etc/kafka/server.properties
COPY docker/config/qdrant/config.yaml /etc/qdrant/config.yaml
COPY docker/config/clickhouse/config.xml /etc/clickhouse-server/config.xml
COPY docker/config/clickhouse/users.xml /etc/clickhouse-server/users.xml
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/bootstrap.sh /usr/local/bin/bootstrap.sh
COPY docker/load-indexer.sh /usr/local/bin/load-indexer.sh
COPY docker/wait-and-run.sh /usr/local/bin/wait-and-run.sh
COPY docker/seed.sh /usr/local/bin/seed.sh

RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/bootstrap.sh \
      /usr/local/bin/load-indexer.sh /usr/local/bin/wait-and-run.sh /usr/local/bin/seed.sh

# Pre-seed Postgres (role, 3 databases, migrations) and ClickHouse (database
# + log table) at build time instead of on every container boot. These paths
# are declared VOLUME below, so Docker auto-copies this baked data into any
# fresh named volume on first `docker run` -- an existing volume is untouched.
RUN /usr/local/bin/seed.sh

# Build the indexer image once and bake it as a loadable tarball; the mount
# reads the indexer stage's filesystem without adding its own image layer.
RUN --mount=type=bind,from=indexer,target=/mnt/indexer \
    tar -C /mnt/indexer -cf /opt/indexer-image.tar .

VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
