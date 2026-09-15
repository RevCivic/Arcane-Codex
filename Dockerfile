# syntax=docker/dockerfile:1.7

# ---- Stage 1: Install dependencies ----
FROM node:22-slim AS deps

# Required for native modules and Prisma migrations
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# Install dependencies with retry logic and improved network configuration
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    npm config set fetch-timeout 60000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm ci --no-audit --no-fund

# ---- Stage 2: Build the application ----
FROM node:22-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# npm automatically executes prebuild → prisma generate
RUN --mount=type=cache,target=/app/.next/cache,sharing=locked npm run build

# ---- Stage 3: Production runner ----
FROM node:22-slim AS runner

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user with a home directory so npm can write its cache there
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --create-home nextjs

# The standalone server already contains `pg`, which the lightweight migration
# runner also uses. This avoids shipping Prisma's 250+ MB development CLI and
# eliminates all npm activity when the container starts.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --chown=nextjs:nodejs deploy-migrations.cjs ./deploy-migrations.cjs
# Copy static assets served by Next.js
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma artefacts (schema, migrations, generated client, config)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/src/generated ./src/generated

# Copy and configure the entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh && chown nextjs:nodejs docker-entrypoint.sh

# Ensure the uploads directory exists and is writable by the non-root user.
# Character images and thumbnails are stored here at runtime.
RUN mkdir -p public/uploads/characters && \
    chown -R nextjs:nodejs public/uploads

USER nextjs

# The internal container port (always 3000; host mapping is handled by Compose)
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["./docker-entrypoint.sh"]
