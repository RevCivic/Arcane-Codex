# ---- Stage 1: Install dependencies and build ----
# Keep these operations in one stage. Copying the roughly 1 GB dependency tree
# between separate deps and builder stages made constrained remote builders spend
# significant time snapshotting files that never belong in the final image.
FROM node:22-slim AS builder

# Required for native modules and Prisma client generation
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# Use the lockfile and bounded retries. The previous five-retry, two-minute
# backoff settings could outlive the stack deployment deadline during an npm
# registry problem and surfaced only as BuildKit DeadlineExceeded.
RUN npm config set fetch-timeout 120000 && \
    npm config set fetch-retry-mintimeout 1000 && \
    npm config set fetch-retry-maxtimeout 10000 && \
    npm config set fetch-retries 2 && \
    npm ci --include=optional --prefer-offline --no-audit --no-fund

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

# Run the application as an unprivileged user. No writable npm cache or home
# directory is needed because the production container never invokes npm.
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs --no-create-home nextjs

# The standalone server already contains `pg`, which the lightweight migration
# runner also uses. This avoids shipping Prisma's 250+ MB development CLI and
# eliminates all npm activity when the container starts.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --chown=nextjs:nodejs deploy-migrations.cjs ./deploy-migrations.cjs
# Turbopack traces Sharp's JavaScript and native binding, but can omit the
# optional libvips package loaded dynamically by that binding. Copy the
# lockfile-installed Linux x64 runtime packages together so image processing never
# depends on a system-wide libvips installation.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img/colour ./node_modules/@img/colour
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img/sharp-linux-x64 ./node_modules/@img/sharp-linux-x64
COPY --from=builder --chown=nextjs:nodejs /app/node_modules/@img/sharp-libvips-linux-x64 ./node_modules/@img/sharp-libvips-linux-x64
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
