# Self-Hosting Guide

Repo Chat self-hosts from a single Docker image. You pull one image, pass two API keys, and run one container — there is no external database or message broker to set up.

The image bundles the whole stack and runs it under one supervisor:

- The four Node services (API gateway, auth, repository, chat) and the static frontend, all served on port 3000.
- Every dependency: PostgreSQL, Redis, ClickHouse, Kafka, and Qdrant.
- A Docker daemon (Docker-in-Docker), used to run each repository's indexing job as a short-lived sibling container.

All state is written to a single `/data` volume, so your data survives restarts.

## Prerequisites

- **Docker Engine** that can run a container with `--privileged`. This is required because the container runs its own Docker daemon to perform indexing.
- **Disk and memory.** The image is large (around 7 GB) — it bundles a JVM (for Kafka), ClickHouse, a full Docker daemon, and a pre-built copy of the indexer image. Give the host at least 10 GB of free disk and ~4 GB of RAM.
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

A fresh container is ready in about 20–30 seconds — the databases are already migrated and the indexer image is already built, both baked into the image itself, so there's nothing to compile on first boot. Then open http://localhost:3000, create an account, and add a public GitHub repository. Its status moves `QUEUED → INDEXING → INDEXED`, after which you can chat with it.

The frontend and the API are served from the same origin, so no separate frontend host or CORS configuration is needed.

## Build the image locally

From the repository root:

```bash
docker build -t repo-chat .
```

Then run it with the `docker run` command above, using `repo-chat` as the image name.

The build is large and slow — it compiles every service and the frontend, installs the bundled infrastructure, **and** builds the indexer image and pre-seeds the Postgres and ClickHouse databases, all baked into the resulting image. None of that work happens again at container startup; a fresh container just loads what's already there.

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

Most of the bootstrapping work — building the indexer image, migrating the three Postgres databases, creating the ClickHouse log table — happens once, at `docker build` time, not on every container start. What's left at boot is just:

1. Starts PostgreSQL, Redis, ClickHouse, Kafka, Qdrant, and the Docker daemon (for Docker-in-Docker indexing containers).
2. On a **fresh** named volume, Docker has already copied in the pre-seeded Postgres and ClickHouse data that was baked into the image — there's nothing to create. (An existing volume from a previous run is left untouched; `repository-service` also re-checks the role/databases/migrations defensively on every boot, in case a future image version ships new migrations against an older volume.) The Kafka topic auto-creates on first use, and the Qdrant collection is created by the indexer on the first indexing run.
3. Loads the pre-built indexer image (a fast filesystem import, no compiling) and starts the four Node services. `repository-service` specifically waits until the indexer image has loaded before accepting traffic, since it's the one that launches indexing containers; the other three services (including the gateway) start as soon as the databases are ready.

A fresh container is typically fully usable — including the ability to add and index a repository — within 20–30 seconds, and a restart is faster still since nothing needs to be re-seeded.

## Data persistence

All state lives under `/data` inside the container:

- The PostgreSQL, ClickHouse, Kafka, Qdrant, and Redis data directories.
- The Docker-in-Docker storage (so the loaded indexer image and any images it needs persist across restarts).
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

- **Restart:** `docker restart <container>`. Your data persists through the `/data` volume, and nothing needs to be rebuilt on the way back up.
- **Upgrade:** pull the new image, stop and remove the old container, then run a new one with the same `/data` volume. Any new database migrations run automatically on boot (the defensive re-check described above).
- **Changing API keys:** pass the new key and restart — that's it. `repository-service` forwards `OPENAI_API_KEY` to each indexing container at launch time rather than it being baked into the indexer image, so rotating it never triggers a rebuild.

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Container exits immediately with a key error | `OPENAI_API_KEY` or `AI_GATEWAY_API_KEY` is missing. Both are required. |
| Indexing never starts; errors about the Docker socket | The container wasn't run with `--privileged`, so the in-container Docker daemon can't start. |
| "Add repository" 502s right after the container starts | `repository-service` isn't accepting traffic yet — it waits for the indexer image to finish loading first. This normally clears within a few seconds; check `/health` and retry. |
| Login seems to succeed but you're immediately logged out | The session cookie is `Secure` while serving over plain HTTP. Ensure `SESSION_COOKIE_SECURE=false` (the default) for HTTP. |
| Port 3000 is already in use | Map a different host port, e.g. `-p 8080:3000`, and set `PUBLIC_URL` to match. |

To see what's happening, follow the logs with `docker logs -f <container>`. To watch the indexing sibling container while a repo indexes, exec in and list containers: `docker exec <container> docker ps`.
