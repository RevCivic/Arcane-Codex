# Arcane-Codex
A codex for a supernatural investigation TTRPG utilizing the Basic Roleplaying system (BRP).

## Running with Docker Compose

The easiest way to run Arcane Codex is with Docker Compose using the published GitHub Container Registry image. The database is persisted automatically in a named Docker volume.

```bash
# Copy the example env file and (optionally) edit HOST_PORT
cp .env.example .env

# Pull and start the app
docker compose up -d
```

The app will be available at `http://localhost:3000` (or whatever `HOST_PORT` is set to).

### Published image automation

The `Publish Docker image` workflow automatically builds and pushes the container image to:

- `ghcr.io/revcivic/arcane-codex:latest` on pushes to `main`
- `ghcr.io/revcivic/arcane-codex:<tag>` on Git tags (for example `v1.0.0`)
- `ghcr.io/revcivic/arcane-codex:sha-<commit>` for traceable commit images

The Compose defaults (`IMAGE_REPOSITORY` and `IMAGE_TAG`) already point at this registry path and can be overridden in `.env` if needed.

### Changing the host port

Set `HOST_PORT` before starting Compose, or add it to your `.env` file:

```bash
# One-off override
HOST_PORT=8080 docker compose up -d

# Or in .env
echo "HOST_PORT=8080" >> .env
docker compose up -d
```

## Local development

```bash
npm install
npx prisma migrate dev
npm run dev
```

## Authentication and access control

Arcane Codex now requires Google sign-in for all app routes.

- Only emails in the allowlist can log in.
- Initial allowlist entries:
  - `mjshank225@gmail.com` (ADMIN)
  - `peightonashlee@gmail.com` (USER)
- Admin users can manage allowed emails at `/admin/access`.

### Google OAuth setup

1. Copy `.env.example` to `.env`.
2. Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, and `AUTH_SECRET`.
3. In Google Cloud OAuth settings, add this redirect URI:
   - `http://localhost:3000/api/auth/callback/google`
