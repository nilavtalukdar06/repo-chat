FROM node:24-bookworm AS builder

WORKDIR /app

RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile

ENV DATABASE_URL="postgresql://u:p@localhost:5432/db"
RUN cd apps/auth-service && pnpm exec prisma generate
RUN cd apps/repository-service && pnpm exec prisma generate
RUN cd apps/chat-service && pnpm exec prisma generate

RUN printf 'VITE_API_URL=\n' > apps/frontend/.env.production
RUN pnpm exec turbo run build --filter=!indexing-service


FROM ubuntu:24.04 AS runtime

ARG KAFKA_VERSION=3.9.0
ARG SCALA_VERSION=2.13
ARG QDRANT_VERSION=1.12.4

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg git bash supervisor \
      postgresql-16 postgresql-client-16 \
      redis-server \
      docker.io \
      default-jre-headless && \
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash - && \
    apt-get install -y --no-install-recommends nodejs && \
    curl -fsSL https://packages.clickhouse.com/deb/pubkey.gpg | gpg --dearmor -o /usr/share/keyrings/clickhouse-keyring.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/clickhouse-keyring.gpg] https://packages.clickhouse.com/deb stable main" > /etc/apt/sources.list.d/clickhouse.list && \
    apt-get update && apt-get install -y --no-install-recommends clickhouse-server clickhouse-client && \
    rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://archive.apache.org/dist/kafka/${KAFKA_VERSION}/kafka_${SCALA_VERSION}-${KAFKA_VERSION}.tgz" -o /tmp/kafka.tgz && \
    mkdir -p /opt/kafka && \
    tar -xzf /tmp/kafka.tgz -C /opt/kafka --strip-components=1 && \
    rm /tmp/kafka.tgz

RUN curl -fsSL "https://github.com/qdrant/qdrant/releases/download/v${QDRANT_VERSION}/qdrant-x86_64-unknown-linux-gnu.tar.gz" -o /tmp/qdrant.tar.gz && \
    tar -xzf /tmp/qdrant.tar.gz -C /usr/local/bin && \
    rm /tmp/qdrant.tar.gz

WORKDIR /app
COPY --from=builder /app /app

COPY docker/config/kafka/server.properties /etc/kafka/server.properties
COPY docker/config/qdrant/config.yaml /etc/qdrant/config.yaml
COPY docker/config/clickhouse/config.d/ /etc/clickhouse-server/config.d/
COPY docker/config/clickhouse/users.d/ /etc/clickhouse-server/users.d/
COPY docker/supervisord.conf /etc/supervisor/supervisord.conf
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
COPY docker/bootstrap.sh /usr/local/bin/bootstrap.sh
COPY docker/wait-and-run.sh /usr/local/bin/wait-and-run.sh

COPY apps/indexing-service /opt/indexer-context

RUN chmod +x /usr/local/bin/entrypoint.sh /usr/local/bin/bootstrap.sh /usr/local/bin/wait-and-run.sh

VOLUME ["/data"]
EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
