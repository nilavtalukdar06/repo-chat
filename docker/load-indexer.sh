#!/usr/bin/env bash
set -euo pipefail

echo "load-indexer: waiting for docker daemon"
until docker info >/dev/null 2>&1; do sleep 1; done

echo "load-indexer: loading pre-built indexer image"
docker import \
  --change 'WORKDIR /home/app' \
  --change 'ENTRYPOINT ["./main.sh"]' \
  /opt/indexer-image.tar repo-chat-indexer:latest

touch /run/indexer-image.done
echo "load-indexer: complete"
