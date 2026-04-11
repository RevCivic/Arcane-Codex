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
3. In Google Cloud Console:
   - Open **APIs & Services** → **OAuth consent screen**.
   - Configure app name/email and add scopes `openid`, `email`, and `profile`.
   - Add test users if your app is in testing mode.
4. Still in Google Cloud Console, create the OAuth client:
   - Go to **APIs & Services** → **Credentials**.
   - Click **Create Credentials** → **OAuth client ID**.
   - Choose **Web application**.
   - Configure URLs for every environment you use:
     - **Authorized redirect URIs**:
       - `YOUR_AUTH_URL/api/auth/callback/google`
       - Example (local): `http://localhost:3000/api/auth/callback/google`
       - Example (custom host): `http://hq.shank-home.net:3001/api/auth/callback/google`
     - **Authorized JavaScript origins** (if Google requires it in your OAuth app config):
       - `YOUR_AUTH_URL`
       - Example (local): `http://localhost:3000`
       - Example (custom host): `http://hq.shank-home.net:3001`
5. Copy the generated Client ID and Client Secret into `.env` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`.

For non-localhost deployments (for example `http://hq.shank-home.net:3001`), set `AUTH_URL` to that exact public URL so Auth.js can trust and generate the correct auth endpoints. `AUTH_URL` must be an origin only (scheme + host + optional port), not a path like `/api/auth` or `/api/auth/callback/google`.

### OAuth troubleshooting (common misconfigurations)

- **`redirect_uri_mismatch` from Google**
  - Ensure your Google OAuth app includes the exact callback URL:
    - `AUTH_URL/api/auth/callback/google`
  - Scheme (`http` vs `https`), host, and port must match exactly.

- **Login succeeds with Google but app denies access**
  - The signed-in email is not in the Arcane Codex allowlist.
  - Ask an admin to add the email at `/admin/access`.

- **Auth callback or state/cookie errors**
  - `AUTH_URL` must be the exact public origin users browse to.
  - Do not include a path in `AUTH_URL`.
  - Keep `AUTH_TRUST_HOST=true` when running behind Docker/reverse proxies you control.

- **`Unknown Action` from Auth.js**
  - Use the in-app **Log in with Google** button (server action), not a bookmarked callback URL.
  - Confirm `AUTH_URL` is origin-only (for example `http://localhost:3000`), not a path (for example `http://localhost:3000/api/auth`).
  - Confirm route handler exists at `src/app/api/auth/[...nextauth]/route.ts`.
  - Visit `/api/auth/signin` directly to verify Auth.js can list the Google provider.

- **`invalid_client` or OAuth client authentication failed**
  - Verify `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are from the same Google OAuth client.
  - Confirm there are no trailing spaces/quotes in `.env`.
