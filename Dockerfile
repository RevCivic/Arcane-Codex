# ---- Stage 1: Install dependencies ----
FROM node:22-slim AS deps

# Required for native modules and Prisma migrations
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ openssl curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# Install dependencies with retry logic and improved network configuration
RUN npm config set fetch-timeout 60000 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-retries 5 && \
    npm ci --no-audit --no-fund

# Keep only the packages required by `prisma migrate deploy` in a dedicated
# stage. The complete development dependency tree is over 1 GB and must not be
# copied into (or exported with) the production image just to run migrations.
# Exact versions are read from the lockfile-installed packages, and --offline
# ensures this pruning step can never fetch a different CLI from npm.
FROM deps AS prisma-cli

RUN node -e 'const fs=require("fs"); const version=(name)=>require(`./node_modules/${name}/package.json`).version; fs.writeFileSync("package.json", JSON.stringify({private:true,dependencies:{dotenv:version("dotenv"),prisma:version("prisma")}},null,2))' && \
    rm -f package-lock.json node_modules/.package-lock.json && \
    npm prune --omit=dev --ignore-scripts --offline --no-audit --no-fund

# ---- Stage 2: Build the application ----
FROM node:22-slim AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# npm automatically executes prebuild → prisma generate
RUN npm run build

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

# Add only the pruned, lockfile-pinned migration toolchain, then overlay the
# standalone server bundle and its traced runtime dependencies. COPY --chown
# avoids creating another large filesystem layer solely to change ownership.
COPY --from=prisma-cli --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
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
