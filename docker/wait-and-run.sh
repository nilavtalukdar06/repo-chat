#!/usr/bin/env bash
set -euo pipefail

until [ -f /run/bootstrap.done ]; do
  sleep 1
done

# Only repository-service sets this: it launches indexing containers, so it
# shouldn't accept traffic until the pre-built indexer image is loaded,
# closing the narrow window where an immediate "add repository" would 502.
if [ "${WAIT_FOR_INDEXER:-}" = "1" ]; then
  until [ -f /run/indexer-image.done ]; do
    sleep 1
  done
fi

exec "$@"
