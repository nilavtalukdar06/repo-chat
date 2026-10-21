# Repo Chat

Repo Chat lets you ask natural-language questions about a public GitHub repository and get answers grounded in its source code. You add a repository by URL. Repo Chat clones it, splits the code into syntax-aware chunks, and stores embeddings in a vector database. Chat answers then cite the files and line ranges they used.

It is intended for developers who need to understand an unfamiliar codebase quickly, for example during onboarding, code review, or when evaluating a dependency.

## Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Usage](#usage)
- [API](#api)
- [Project structure](#project-structure)
- [Quality checks](#quality-checks)
- [Deployment notes](#deployment-notes)
- [Limitations](#limitations)
- [Contributing](#contributing)
- [License](#license)

## Overview

Reading an unfamiliar repository usually means grepping for names you don't know yet. General-purpose chat models can't help much because they haven't seen the code, or they answer from stale training data.

Repo Chat indexes the actual code and runs retrieval-augmented generation (RAG) over it:

1. **Indexing.** An isolated container clones the repository and parses every supported source file with tree-sitter. It chunks the code along syntax boundaries, embeds each chunk with OpenAI `text-embedding-3-small`, and stores the vectors in Qdrant. Each chunk is tagged with its repository and user.
2. **Answering.** For each question, a small model routes the query to one of four strategies: search as written, rewrite it into a standalone query, generate a hypothetical code snippet (HyDE), or decline it as off-topic. Dense vector search and BM25 keyword search run in parallel. A reranker narrows the combined results to the 8 most relevant chunks, and the answer streams back with those chunks as context.

## Features

- **Accounts:** sign up and sign in with email and password. Sessions are stored in Redis and last 7 days.
- **Add repositories:** paste a public GitHub URL. Name, description, star count, and primary language are fetched from the GitHub API.
- **Track indexing:** each repository moves through `QUEUED → INDEXING → INDEXED` (or `FAILED`), and the UI polls for status changes. Re-queueing a repository re-runs indexing from scratch.
- **Live indexing logs:** a per-repository log view shows indexer progress, for example "stored 640 chunks from 112 files".
- **Chat with a repository:** responses stream as they are generated, with status updates (analyzing → searching → reranking → generating) and a list of the source files and line ranges used.
- **Chat history:** chats are grouped per repository and paginated, and you can rename them or delete them one at a time. The first message automatically gets a title.
- **Off-topic guard:** the chat declines questions that aren't about the selected repository instead of answering from general knowledge.
- **Cleanup:** deleting a repository also deletes its vectors, indexing logs, and chats.

## Architecture

```mermaid
flowchart LR
    subgraph client ["Client"]
        web["Frontend<br/>React + Vite"]
    end

    subgraph edge ["Edge"]
        gateway["API Gateway<br/>session check, rate limit, proxy"]
    end

    subgraph services ["Services"]
        auth["Auth Service"]
        repo["Repository Service"]
        chat["Chat Service<br/>RAG"]
    end

    subgraph indexing ["Indexing (AWS ECS Fargate)"]
        indexer["Indexing Task<br/>clone, chunk, embed"]
    end

    subgraph data ["Data Stores"]
        authDb[("Auth Postgres")]
        redis[("Redis<br/>sessions")]
        repoDb[("Repository Postgres")]
        chatDb[("Chat Postgres")]
        qdrant[("Qdrant<br/>code_chunks")]
        clickhouse[("ClickHouse<br/>log_events")]
    end

    kafka{{"Kafka<br/>repo-chat-logs"}}

    subgraph external ["External"]
        github["GitHub"]
        ecs["AWS ECS"]
        openai["OpenAI"]
        aiGateway["Vercel AI Gateway<br/>Voyage rerank"]
    end

    web -->|"HTTPS /api"| gateway
    gateway -->|"/api/auth, validate session"| auth
    gateway -->|"/api/repository"| repo
    gateway -->|"/api/chat"| chat

    auth --> authDb
    auth --> redis

    repo --> repoDb
    repo -->|"read logs"| clickhouse
    repo -->|"delete vectors"| qdrant
    repo -->|"delete chats"| chat
    repo -->|"RunTask"| ecs
    ecs -.->|"launches"| indexer

    chat --> chatDb
    chat -->|"hybrid search"| qdrant
    chat -->|"load repository"| repo
    chat -->|"route, rewrite, answer"| openai
    chat -->|"rerank"| aiGateway

    indexer -->|"git clone"| github
    indexer -->|"embeddings"| openai
    indexer -->|"upsert chunks"| qdrant
    indexer -->|"update status"| repoDb
    indexer -.->|"publish logs"| kafka
    kafka -.->|"consume logs"| repo
```

| Component | Responsibility |
|---|---|
| `frontend` | React SPA for authentication, repository management, indexing logs, and chat. Talks only to the gateway. |
| `api-gateway` | Single public entry point. Applies rate limiting and CORS. Validates the session cookie against `auth-service` and forwards `x-user-id`, `x-user-email`, and `x-request-id` headers to downstream services. |
| `auth-service` | Registration, login, and logout. Stores users in Postgres (bcrypt-hashed passwords) and sessions in Redis. |
| `repository-service` | Repository CRUD. Starts an indexing task on AWS ECS for each new or re-queued repository. Consumes indexing logs from Kafka into ClickHouse and serves them to the UI. |
| `indexing-service` | Short-lived container, one run per repository. Clones the repository, chunks and embeds it, writes vectors to Qdrant, updates repository status in the repository database, and publishes progress logs to Kafka. |
| `chat-service` | Stores chats and messages. Runs the RAG pipeline (routing, query transformation, hybrid search, reranking) and streams answers with the Vercel AI SDK UI message protocol. |

Key design decisions:

- **Session auth at the edge.** Downstream services don't parse cookies. They trust the `x-user-id` header set by the gateway, so they must not be reachable from the public internet.
- **Indexing runs out of process.** Cloning and embedding a large repository is slow and resource-heavy, so `repository-service` starts a separate ECS task for each repository instead of indexing in its own process.
- **Shared repository table.** `indexing-service` writes repository status directly to `repository-service`'s Postgres database. It has its own copy of the Prisma schema but no migrations, so `repository-service` owns the schema.
- **Hybrid retrieval with fallbacks.** If the query router fails, the question is searched as written. If one search method fails, the other's results are used. If the reranker fails, results are combined with reciprocal rank fusion instead.

Each HTTP service also serves an OpenAPI spec at `/docs.json` and Swagger UI at `/docs`.

## Tech stack

| Area | Technologies |
|---|---|
| Monorepo | pnpm workspaces, Turborepo, TypeScript, tsup |
| Frontend | React 19, Vite, React Router 7, TanStack Query, React Hook Form + Zod, Tailwind CSS 4, shadcn/ui, Streamdown + Shiki for Markdown and code highlighting |
| Backend | Node.js 24+, Express 5, Zod, `@t3-oss/env-core` for validated config, pino logging, Helmet, `http-proxy-middleware` |
| Data | PostgreSQL 16 with Prisma 7 (one database per service), Redis 7 for sessions, ClickHouse for indexing logs |
| Messaging | Kafka (kafkajs) for streaming logs from the indexer to `repository-service` |
| AI and search | Vercel AI SDK, OpenAI chat and embedding models, Vercel AI Gateway for reranking (`voyage/rerank-3-lite` by default), Qdrant, chonkie + tree-sitter for code chunking |
| Infrastructure | Docker Compose for local dependencies, AWS ECS (Fargate or EC2) for indexing tasks |

## Prerequisites

| Requirement | Notes |
|---|---|
| Node.js `>= 24` | Required by the root `package.json`. The indexer image installs Node 24. |
| pnpm `11.25.0` | Pinned via `packageManager`. Run `corepack enable` to use it. |
| Docker with Docker Compose | Runs Postgres, Redis, and ClickHouse locally. |
| Kafka cluster with **TLS and SASL/PLAIN** | Both Kafka clients always connect over TLS with a CA file named `ca.pem`. See [Limitations](#limitations). |
| Qdrant | Qdrant Cloud or a self-hosted instance with an API key. |
| OpenAI API key | Used for chat, titles, query routing and rewriting, and embeddings. |
| Vercel AI Gateway API key | Used for reranking. |
| AWS account | Needs an ECS cluster, a task definition for the indexer image, subnets, a security group, and IAM credentials allowed to call `ecs:RunTask`. |

## Local setup

All commands below run from the repository root unless a step says otherwise.

### 1. Clone and install

```bash
git clone https://github.com/nilavtalukdar06/repo-chat.git
cd repo-chat
corepack enable
pnpm install
```

### 2. Start local infrastructure

Each service with stateful dependencies has its own `docker-compose.yml`. Both `auth-service` and `repository-service` publish Postgres on port `5432` by default, so give the second one a different port:

```bash
docker compose -f apps/auth-service/docker-compose.yml up -d        # Postgres :5432, Redis :6379
docker compose -f apps/chat-service/docker-compose.yml up -d        # Postgres :5433
POSTGRES_PORT=5434 docker compose -f apps/repository-service/docker-compose.yml up -d postgres clickhouse
```

The `repository-service` Compose file also defines a Kafka container. It isn't started here because it is plaintext-only and the Kafka clients require TLS.

Default credentials for each Compose database are the service name for the user, password, and database name, for example `auth_service:auth_service@localhost:5432/auth_service`.

### 3. Create the ClickHouse table

```bash
docker compose -f apps/repository-service/docker-compose.yml exec -T clickhouse \
  clickhouse-client --user repository_service --password repository_service \
  --database repository_service --multiquery < apps/repository-service/src/logs/clickhouse-logs.sql
```

### 4. Configure environment variables

Create a `.env` file in each app directory using the tables in [Environment variables](#environment-variables):

```bash
cp apps/frontend/.env.example apps/frontend/.env
touch apps/api-gateway/.env apps/auth-service/.env apps/repository-service/.env apps/chat-service/.env
```

Put your Kafka CA certificate at `apps/repository-service/ca.pem`. The indexer image also needs it at `apps/indexing-service/ca.pem`. Both files are gitignored.

### 5. Generate Prisma clients and run migrations

The Prisma config files are named `prisma7.config.ts`, so pass `--config` explicitly:

```bash
for svc in auth-service repository-service chat-service; do
  pnpm --filter "$svc" exec prisma generate --config prisma7.config.ts
  pnpm --filter "$svc" exec prisma migrate deploy --config prisma7.config.ts
done
```

### 6. Start the application

```bash
pnpm dev
```

This starts the frontend, gateway, and the auth, repository, and chat services in watch mode. `indexing-service` is excluded because it runs as an ECS task, not a long-running server.

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| API gateway | http://localhost:3000 |
| auth-service | http://localhost:4000 |
| repository-service | http://localhost:4001 |
| chat-service | http://localhost:4002 |

### 7. Verify

```bash
curl http://localhost:3000/health
```

A healthy stack returns `200` with `authService`, `repositoryService`, and `chatService` all `true`. Each service's own `/health` endpoint reports its dependencies (Postgres, Redis, Kafka, and ClickHouse, depending on the service).

Then open http://localhost:5173, create an account, and add a repository.

## Environment variables

Each app reads its own `.env` file, which is loaded by `dotenv` and validated with Zod at startup. A service won't start if a required variable is missing.

### `apps/frontend`

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_URL` | No | `http://localhost:3000` | Base URL of the API gateway. |

### `apps/api-gateway`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4002` | **Set to `3000`.** The default conflicts with `chat-service`, and the frontend expects the gateway on `3000`. |
| `CLIENT_URL` | Yes | | Allowed CORS origins, comma-separated, for example `http://localhost:5173`. |
| `NODE_ENV` | No | `development` | `development` or `production`. |
| `RATE_LIMIT_WINDOW_MS` | Yes | | Rate-limit window in milliseconds, for example `60000`. |
| `RATE_LIMIT_MAX_REQUESTS` | Yes | | Maximum requests per client per window. |
| `AUTH_SERVICE_URL` | Yes | | For example `http://localhost:4000`. |
| `REPOSITORY_SERVICE_URL` | Yes | | For example `http://localhost:4001`. |
| `CHAT_SERVICE_URL` | Yes | | For example `http://localhost:4002`. |
| `SERVICE_REQUEST_TIMEOUT_MS` | No | `5000` | Timeout for session validation and health checks. |

### `apps/auth-service`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | |
| `CLIENT_URL` | Yes | | Allowed CORS origin(s). |
| `NODE_ENV` | No | `development` | Session cookies are `Secure` only in `production`. |
| `BODY_LIMIT` | No | `10kb` | Maximum request body size. |
| `DATABASE_URL` | Yes | | Postgres connection string. |
| `REDIS_URL` | Yes | | For example `redis://localhost:6379`. |
| `SESSION_SECRET` | Yes | | At least 32 characters. Generate one with `openssl rand -hex 32`. |

### `apps/repository-service`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4001` | |
| `CLIENT_URL` | Yes | | Allowed CORS origin(s). |
| `NODE_ENV` | No | `development` | |
| `BODY_LIMIT` | No | `10kb` | |
| `DATABASE_URL` | Yes | | Postgres connection string. The indexer must also be able to reach this database. |
| `AWS_REGION` | Yes | | Region of the ECS cluster. |
| `AWS_ACCESS_KEY_ID` | Yes | | IAM credentials allowed to call `ecs:RunTask`. |
| `AWS_SECRET_ACCESS_KEY` | Yes | | |
| `ECS_CLUSTER` | Yes | | Cluster name or ARN. |
| `ECS_TASK_DEFINITION` | Yes | | Task definition for the indexer image. |
| `ECS_CONTAINER_NAME` | Yes | | Container name in the task definition. Used for environment overrides. |
| `ECS_SUBNET_IDS` | Yes | | Comma-separated subnet IDs. |
| `ECS_SECURITY_GROUP_IDS` | Yes | | Comma-separated security group IDs. |
| `ECS_LAUNCH_TYPE` | No | `FARGATE` | `FARGATE` or `EC2`. |
| `ECS_ASSIGN_PUBLIC_IP` | No | `DISABLED` | `ENABLED` or `DISABLED`. The task needs outbound access to GitHub, OpenAI, Qdrant, Kafka, and Postgres. |
| `CLICKHOUSE_URL` | Yes | | Include the database in the path, for example `http://localhost:8123/repository_service`. |
| `CLICKHOUSE_ADMIN` | Yes | | ClickHouse username. |
| `CLICKHOUSE_PASSWORD` | Yes | | |
| `KAFKA_BROKER` | Yes | | `host:port` of a TLS + SASL/PLAIN broker. |
| `KAFKA_USERNAME` | Yes | | |
| `KAFKA_PASSWORD` | Yes | | |
| `QDRANT_URL` | Yes | | Used to delete vectors when a repository is deleted. |
| `QDRANT_API_KEY` | Yes | | |
| `CHAT_SERVICE_URL` | Yes | | Used to delete chats when a repository is deleted. |
| `SERVICE_REQUEST_TIMEOUT_MS` | No | `5000` | |

### `apps/chat-service`

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4002` | |
| `CLIENT_URL` | Yes | | Allowed CORS origin(s). |
| `NODE_ENV` | No | `development` | |
| `BODY_LIMIT` | No | `10kb` | |
| `DATABASE_URL` | Yes | | Postgres connection string. |
| `OPENAI_API_KEY` | Yes | | |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | Model that writes answers. |
| `OPENAI_TITLE_MODEL` | No | `gpt-4o-mini` | Model that generates chat titles. |
| `QUERY_ROUTER_MODEL` | No | `gpt-4.1-nano` | Model that picks the retrieval strategy. |
| `QUERY_REWRITE_MODEL` | No | `gpt-4o-mini` | Model that rewrites queries and writes HyDE snippets. |
| `AI_GATEWAY_API_KEY` | Yes | | Vercel AI Gateway key, used for reranking. |
| `AI_GATEWAY_BASE_URL` | No | | Override the AI Gateway endpoint. |
| `RERANK_MODEL` | No | `voyage/rerank-3-lite` | Reranking model, accessed through the AI Gateway. |
| `QDRANT_URL` | Yes | | |
| `QDRANT_API_KEY` | Yes | | |
| `QDRANT_COLLECTION` | No | `code_chunks` | Must match the collection the indexer writes to, which is hard-coded as `code_chunks`. |
| `REPOSITORY_SERVICE_URL` | Yes | | Used to check that a repository is owned by the user and fully indexed. |
| `SERVICE_REQUEST_TIMEOUT_MS` | No | `5000` | |

### `apps/indexing-service`

These values are baked into the Docker image (the `Dockerfile` copies `.env`), except `GIT_URL`, `REPOSITORY_ID`, and `USER_ID`, which `repository-service` passes as ECS container overrides on each run.

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | No | `development` | |
| `DATABASE_URL` | Yes | | **`repository-service`'s** Postgres database. |
| `KAFKA_BROKER` / `KAFKA_USERNAME` / `KAFKA_PASSWORD` | Yes | | Same cluster as `repository-service`. |
| `QDRANT_URL` / `QDRANT_API_KEY` | Yes | | |
| `OPENAI_API_KEY` | Yes | | Used for embeddings. |
| `OUTPUT_DIR` | No | `/home/app/output` | Clone destination. `main.sh` always clones to `/home/app/output`. |
| `GIT_URL` | Set per run | | Repository to clone. |
| `REPOSITORY_ID` | Set per run | | |
| `USER_ID` | Set per run | | |

## Usage

1. **Sign up** at `/signup`, or sign in at `/signin`.
2. **Add a repository** on the Repositories page by pasting a URL such as `https://github.com/expressjs/express`. The card shows `QUEUED`, then `INDEXING`, then `INDEXED`.
3. **Watch progress** under the repository's logs view (`/repositories/:id/logs`).
4. **Start a chat** from the home page: pick an indexed repository and ask a question, for example:
   - "How is session validation handled between the gateway and auth service?"
   - "Where are retries configured for vector upserts?"
   - "What does `extractTerms` do?"
5. Each answer shows the source chunks it used. Use the sidebar to revisit, rename, or delete chats.

## API

All client traffic goes through the gateway. Every route except register, login, health, and docs requires a valid `connect.sid` session cookie. Responses use this envelope:

```json
{ "success": true, "statusCode": 200, "message": "…", "data": {}, "meta": {} }
```

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Body: `{ name, email, password }`. The password must be at least 8 characters. |
| `POST` | `/api/auth/login` | Body: `{ email, password }`. Sets the session cookie. |
| `POST` | `/api/auth/logout` | Destroys the session. |
| `GET` | `/api/auth/me` | Returns the current user. |
| `POST` | `/api/repository` | Body: `{ githubUrl }`. Creates the repository and starts indexing. |
| `GET` | `/api/repository?page=&limit=&search=` | Paginated list. `limit` is at most 100. |
| `GET` | `/api/repository/:id` | Gets one repository. |
| `GET` | `/api/repository/:id/logs` | Indexing logs from ClickHouse. |
| `PATCH` | `/api/repository/:id` | Body: `{ status }`. Setting `QUEUED` re-runs indexing. |
| `DELETE` | `/api/repository/:id` | Deletes the repository with its vectors, logs, and chats. Returns `409` while queued or indexing. |
| `GET` | `/api/chat?repositoryId=&limit=&cursor=` | Cursor-paginated chats for a repository. `limit` is at most 50. |
| `GET` | `/api/chat/:id` | Gets a chat with its messages. |
| `PATCH` | `/api/chat/:id` | Body: `{ title }`. Renames the chat. |
| `DELETE` | `/api/chat/:id` | Deletes one chat. |
| `DELETE` | `/api/chat?repositoryId=` | Deletes all of the user's chats for a repository. |
| `POST` | `/api/chat/:id/messages` | Body: `{ repositoryId, message: { parts: [{ type: "text", text }] } }`. Text is at most 4000 characters. Streams an AI SDK UI message stream. The chat is created on the first message if the client-generated `:id` is new. Returns `409` if the repository isn't indexed. |

For full request and response schemas, open `/docs` on the gateway or on any individual service.

## Project structure

```text
apps/
  frontend/             React SPA
    src/features/       auth, chats, repositories: API calls, queries, hooks, components
    src/routes/         route components (lazy-loaded)
  api-gateway/          public edge: proxy, session check, rate limiting, aggregate health
  auth-service/         users and sessions
  repository-service/   repositories, ECS task launch, Kafka → ClickHouse log pipeline
    src/logs/           Kafka consumer, ClickHouse client, table DDL
  chat-service/         chats, messages, RAG pipeline
    src/services/       rag, query-router, query-transform, retrieval, title
    src/constants/      prompts
  indexing-service/     ECS task: clone, chunk, embed, store
    src/indexer/        files → chunk → embed → store
packages/
  eslint-config/        shared ESLint configs
  typescript-config/    shared tsconfig bases
  ui/                   Turborepo starter components (not currently used by any app)
```

The backend services follow the same layering: `routes → controllers → services → repositories`, with Zod validators, a shared `ApiError` and response helper, request-ID middleware, and a Prisma client generated into `src/generated/prisma` (gitignored).

## Quality checks

Run these from the repository root. Turborepo runs them in every workspace that defines the script.

```bash
pnpm lint          # ESLint
pnpm check-types   # tsc --noEmit (backend services and packages/ui)
pnpm build         # tsup for services; tsc -b && vite build for the frontend
pnpm format        # Prettier for .ts, .tsx, and .md
```

The repository has no automated test suite yet.

## Deployment notes

There are no deployment manifests in the repository apart from the indexer `Dockerfile`. To run the stack in production:

- **Build** with `pnpm build` and start each service with `pnpm --filter <service> start` (`node dist/index.js`). The frontend builds to `apps/frontend/dist` as static files.
- **Migrate** each database with `prisma migrate deploy --config prisma7.config.ts` before starting the new version.
- **Expose only the gateway** (and the frontend's static host). The internal services trust the `x-user-id` header and must stay on a private network.
- **Set `NODE_ENV=production`** so session cookies are marked `Secure`. The frontend and gateway must be on the same site, because the session cookie is `SameSite=Lax`.
- **Indexer image.** Build it from `apps/indexing-service`, with `.env` and `ca.pem` present in that directory, and push it to a registry that your ECS task definition references:

  ```bash
  cd apps/indexing-service
  docker build -t repo-chat-indexer .
  ```

  The image includes `.env` and `ca.pem`, so treat it as containing secrets and push it only to a private registry.
- **Health checks.** Every service exposes `GET /health`, which checks its dependencies and returns `503` when degraded, and `GET /ready`, a liveness check that always returns `200`.

## Limitations

- **Public GitHub repositories only.** Metadata comes from the unauthenticated GitHub API, which allows 60 requests per hour per IP, and the indexer clones without credentials.
- **Snapshot indexing.** Only the default branch is indexed, as a shallow clone. Changes pushed later aren't picked up until you re-queue the repository.
- **File filtering.** Files larger than 512 KB, binary files, lockfiles, minified or generated files, `.env*` files, and key or certificate files are skipped, as are paths ignored by the repository's `.gitignore`. Only languages supported by the tree-sitter language pack are indexed.
- **Kafka must use TLS.** Both Kafka clients require TLS with SASL/PLAIN and read a `ca.pem` file. The plaintext Kafka container in `apps/repository-service/docker-compose.yml` won't work with them unless the client config is changed.
- **Indexing depends on AWS ECS.** There's no local runner. Adding a repository fails with `502` if the ECS task can't be started.
- **Internal services trust the gateway.** They don't verify sessions themselves.
- **AI output can be wrong.** Answers are generated from at most 8 retrieved chunks, so they can miss relevant code or misread it. Check important answers against the cited files.
- **Data handling.** Source code chunks are sent to OpenAI for embedding and to the configured reranking provider through the AI Gateway. Questions and conversation history are sent to OpenAI.

## Contributing

1. Open an issue at <https://github.com/nilavtalukdar06/repo-chat/issues> to report a bug or propose a change.
2. Create a branch from `main`, follow the [Local setup](#local-setup) steps, and keep changes scoped to the relevant app or package.
3. Before opening a pull request, run `pnpm lint`, `pnpm check-types`, and `pnpm build`.
4. If you change a Prisma schema, add a migration in that service's `prisma/migrations`. If you change `repository-service`'s `Repository` model, update `apps/indexing-service/prisma/schema.prisma` to match.

## License

No license file has been added yet, so all rights are reserved by the author by default. Ask the repository owner before reusing the code.
