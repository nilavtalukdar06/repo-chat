#!/bin/bash

export GIT_URL="$GIT_URL"
git clone --depth 1 "$GIT_URL" /home/app/output
exec node dist/index.js
