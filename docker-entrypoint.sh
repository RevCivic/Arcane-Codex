#!/bin/sh
set -e

echo "Running database migrations..."
tries=0
PRISMA_CLI="./node_modules/.bin/prisma"

if [ ! -x "$PRISMA_CLI" ]; then
  echo "Prisma CLI is missing from the application image; refusing to download an unpinned version."
  exit 1
fi

until "$PRISMA_CLI" migrate deploy; do
  tries=$((tries + 1))
  if [ "$tries" -ge 20 ]; then
    echo "Database migrations failed after ${tries} attempts."
    exit 1
  fi
  echo "Migration attempt ${tries} failed; retrying in 3s..."
  sleep 3
done

echo "Starting Arcane Codex on port ${PORT:-3000}..."
exec node server.js
