# Arcane-Codex
A codex for a supernatural investigation TTRPG utilizing the Basic Roleplaying system (BRP).

## Running with Docker Compose

The easiest way to run Arcane Codex is with Docker Compose. The database is persisted automatically in a named Docker volume.

```bash
# Copy the example env file and (optionally) edit HOST_PORT
cp .env.example .env

# Build and start the app
docker compose up -d
```

The app will be available at `http://localhost:3000` (or whatever `HOST_PORT` is set to).

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
2. Set `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `AUTH_URL`, and `AUTH_TRUST_HOST`.
3. In Google Cloud OAuth settings, configure URLs for every environment you use:
   - **Authorized redirect URIs**:
     - `YOUR_AUTH_URL/api/auth/callback/google`
     - Example (local): `http://localhost:3000/api/auth/callback/google`
     - Example (custom host): `http://hq.shank-home.net:3001/api/auth/callback/google`
   - **Authorized JavaScript origins** (if Google requires it in your OAuth app config):
     - `YOUR_AUTH_URL`
     - Example (local): `http://localhost:3000`
     - Example (custom host): `http://hq.shank-home.net:3001`

For non-localhost deployments (for example `http://hq.shank-home.net:3001`), set `AUTH_URL` to that exact public URL so Auth.js can trust and generate the correct auth endpoints. `AUTH_URL` must be an origin only (scheme + host + optional port), not a path like `/api/auth` or `/api/auth/callback/google`.
