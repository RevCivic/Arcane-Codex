#!/bin/sh
set -e

echo "Running database migrations..."
tries=0
until npx prisma migrate deploy; do
  tries=$((tries + 1))
  if [ "$tries" -ge 20 ]; then
    echo "Database migrations failed after ${tries} attempts."
    exit 1
  fi
  echo "Migration attempt ${tries} failed; retrying in 3s..."
  sleep 3
done

echo "Starting Arcane Codex on port ${PORT:-3000}..."
exec npm run start
