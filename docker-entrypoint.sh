#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting Arcane Codex on port ${PORT:-3000}..."
exec npm run start
