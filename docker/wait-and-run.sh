#!/usr/bin/env bash
set -euo pipefail

until [ -f /run/bootstrap.done ]; do
  sleep 1
done

exec "$@"
