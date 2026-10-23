# Self-Hosting Guide

Repo Chat self-hosts from a single Docker image. You pull one image, pass two API keys, and run one container — there is no external database or message broker to set up.

The image bundles the whole stack and runs it under one supervisor:

- The four Node services (API gateway, auth, repository, chat) and the static frontend, all served on port 3000.
- Every dependency: PostgreSQL, Redis, ClickHouse, Kafka, and Qdrant.
- A Docker daemon (Docker-in-Docker), used to run each repository's indexing job as a short-lived sibling container.

All state is written to a single `/data` volume, so your data and the built indexer image survive restarts.

## Prerequisites

- **Docker Engine** that can run a container with `--privileged`. This is required because the container runs its own Docker daemon to perform indexing.
- **Disk and memory.** The image is large — it bundles a JVM (for Kafka), ClickHouse, and a full Docker daemon. Give the host a few GB of free disk and at least ~4 GB of RAM.
- **An OpenAI API key** (`OPENAI_API_KEY`) — used for chat, embeddings, titles, and query routing.
- **A Vercel AI Gateway key** (`AI_GATEWAY_API_KEY`) — used for reranking retrieved code.

Both keys are required; the container refuses to start without them.

## Quick start

Run the container, passing your two API keys and a named volume for persistence:

```bash
docker run -d --privileged \
  -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -e AI_GATEWAY_API_KEY=... \
  -e PUBLIC_URL=http://localhost:3000 \
  -v repo-chat-data:/data \
  <dockerhub-user>/repo-chat:latest
```

Give it a minute on first boot — it runs database migrations and builds the indexer image. Then open http://localhost:3000, create an account, and add a public GitHub repository. Its status moves `QUEUED → INDEXING → INDEXED`, after which you can chat with it.

The frontend and the API are served from the same origin, so no separate frontend host or CORS configuration is needed.

## Build the image locally

From the repository root:

```bash
docker build -t repo-chat .
```

Then run it with the `docker run` command above, using `repo-chat` as the image name.

The build is large and slow — it compiles every service and the frontend, then installs the bundled infrastructure. The indexer image itself is **not** built during `docker build`; it is built the first time the container starts (it needs the in-container Docker daemon) and cached on the `/data` volume for later runs.

## Configuration

Pass these as `-e` flags to `docker run`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `OPENAI_API_KEY` | Yes | | Chat, embeddings, titles, and query routing/rewriting. |
| `AI_GATEWAY_API_KEY` | Yes | | Vercel AI Gateway key, used for reranking. |
| `PUBLIC_URL` | No | `http://localhost:3000` | The origin the app is served from; used for CORS. Set this to your real URL when exposing the app. |
| `SESSION_SECRET` | No | auto-generated | Session signing secret. One is generated on first boot and persisted to `/data` if you don't supply one. |
| `SESSION_COOKIE_SECURE` | No | `false` | Whether the session cookie is marked `Secure`. Keep `false` for plain HTTP; set `true` behind an HTTPS proxy. |

Everything else (database URLs, the Kafka broker, internal ports) is wired to `localhost` inside the container and needs no configuration.

## What happens on startup

On each boot the container prepares and supervises the whole stack, then a one-time bootstrap step runs before the app services accept traffic:

1. Starts the Docker daemon, then PostgreSQL, Redis, ClickHouse, Kafka, and Qdrant.
2. Creates the three PostgreSQL databases (`auth_service`, `repository_service`, `chat_service`) and runs `prisma migrate deploy` against each.
3. Creates the ClickHouse `repository_service` database. The `log_events` table is created idempotently by the repository service itself on startup, so there is never a manual DDL step.
4. Creates the Kafka `repo-chat-logs` topic. The Qdrant `code_chunks` collection is created automatically on the first indexing run.
5. Builds the indexer image, then starts the four Node services. The gateway serves the frontend and proxies `/api`.

Because the app services wait for this bootstrap to finish, the first boot takes longer than later ones.

## Data persistence

All state lives under `/data` inside the container:

- The PostgreSQL, ClickHouse, Kafka, Qdrant, and Redis data directories.
- The Docker image cache, so the built indexer image survives restarts.
- The generated `SESSION_SECRET`.

Mount a named volume to keep it across restarts: `-v repo-chat-data:/data`.

- **Back up** by copying the volume, for example `docker run --rm -v repo-chat-data:/data -v "$PWD":/backup alpine tar czf /backup/repo-chat.tgz -C /data .`
- **Reset everything** by removing the volume (`docker volume rm repo-chat-data`) and starting a fresh container.

## Exposing it safely

- `--privileged` is required for the in-container Docker daemon that runs indexing. Only run this image on a host you trust, and keep that host off the public internet unless it is properly firewalled.
- The internal services trust the gateway and do not verify sessions themselves, so expose only port 3000 — never the internal service ports.

To serve over HTTPS, put the container behind a TLS-terminating reverse proxy (nginx, Caddy, or a load balancer) and:

1. Set `PUBLIC_URL` to your `https://` origin.
2. Set `SESSION_COOKIE_SECURE=true` so the session cookie is only sent over HTTPS.

Keep the frontend and API on the same origin (the gateway), since the session cookie is `SameSite=Lax`.

## Updating and restarting

- **Restart:** `docker restart <container>`. Your data and the cached indexer image persist through the `/data` volume.
- **Upgrade:** pull the new image, stop and remove the old container, then run a new one with the same `/data` volume. Any new database migrations run automatically on boot.
- **Changing API keys:** pass the new key and restart. The indexer bakes the OpenAI key into its image, so it is rebuilt on the next boot when the key changes — adding a few minutes to that one startup.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Container exits immediately with a key error | `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY` is missing. Both are required. |
| Indexing never starts; errors about the Docker socket | The container wasn't run with `--privileged`, so the in-container Docker daemon can't start. |
| The first indexing run is slow | The indexer image is being built inside the container on first use; it is cached on `/data` afterwards. |
| Login seems to succeed but you're immediately logged out | The session cookie is `Secure` while serving over plain HTTP. Ensure `SESSION_COOKIE_SECURE=false` (the default) for HTTP. |
| Port 3000 is already in use | Map a different host port, e.g. `-p 8080:3000`, and set `PUBLIC_URL` to match. |

To see what's happening, follow the logs with `docker logs -f <container>`. To watch the indexing sibling container while a repo indexes, exec in and list containers: `docker exec <container> docker ps`.
