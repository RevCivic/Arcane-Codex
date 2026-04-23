# Arcane-Codex
A codex for a supernatural investigation TTRPG utilizing the Basic Roleplaying system (BRP).

## Running with Docker Compose

The easiest way to run Arcane Codex is with Docker Compose. A PostgreSQL database is started automatically and persisted in a named Docker volume.

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
cp .env.example .env
# ensure DATABASE_URL points to your local PostgreSQL instance
npx prisma migrate dev
npm run dev
```

## Migrating existing SQLite data to PostgreSQL

If you have an existing SQLite database (for example `prisma/dev.db`) you can migrate it into a fresh PostgreSQL database:

```bash
# 1) start postgres (or use your own postgres instance)
docker compose up -d db

# 2) set env vars (example values)
export DATABASE_URL='postgresql://postgres:postgres@localhost:5432/arcane_codex?schema=public'
export SQLITE_DATABASE_URL='file:./prisma/dev.db'

# 3) apply postgres schema and migrate data
npx prisma migrate deploy
npm run db:migrate:sqlite-to-postgres
```

Notes:
- The PostgreSQL target must be empty before running `db:migrate:sqlite-to-postgres`.
- The migration preserves primary keys and relationship links.

## Character sheets and ownership

### How claim / ownership works

Each player user can claim **exactly one** character. Once claimed, the character is linked to that user's Google account email.

| Actor | What they can do |
|-------|-----------------|
| **USER** (unclaimed) | Browse all characters; claim any unclaimed character |
| **USER** (owner) | View + edit their own character sheet; unclaim their character |
| **ADMIN** | View + edit any character sheet; assign or clear any claim from the admin assign form on the character detail page |

Rules:
- One user → one character, one character → one user (1 : 1).
- A user must unclaim their current character before claiming a new one.
- Admins cannot claim characters themselves (`/my-character` redirects admins to `/characters`).

### Claiming a character

1. Sign in with your Google account.
2. Go to **Characters** and open any unclaimed character.
3. Click **Claim**. The character is now linked to your account.
4. Click **📋 Sheet** on the character detail page, or use **My Character** in the nav bar, to open your character sheet.

### Character sheet

The character sheet at `/characters/[id]/sheet` contains:

- **Primary Characteristics** — STR, CON, SIZ, DEX, INT, POW, CHA, APP, EDU
- **Derived Statistics** — Hit Points (current/max), Sanity (current/max), Magic Points (current/max), Luck, Build
- **Skills** — grouped by category (Combat, Investigation, Academic, Social, Physical, Technical, Other); each skill shows the global base % and can be overridden with a character-specific value
- **FoundryVTT JSON import** — paste a Foundry actor export directly on the sheet to import stats and skills; missing skills are auto-created
- **Wounds & Notes** — free-text fields for injuries and session notes
- **Carried Items** — read-only list of inventory items whose `carrierId` is this character
- **Powers** — read-only list of powers assigned to this character

### Admin skill management

Admins can define, edit, and remove the global skill list at `/admin/skills`. Skills are shared across all character sheets.

- **Add skill** — set name, category, base value (%), description, and sort order
- **Edit skill** — change any field; existing character skill values are preserved
- **Delete skill** — removes the skill definition and all character-specific values (with confirmation)

The default seed includes 29 standard BRP / Call of Cthulhu skills grouped across six categories.

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

> **⚠ Most common cause of `Unknown Action` errors:** `AUTH_URL` is left as `http://localhost:3000` when the app is deployed on a different host. Auth.js uses `AUTH_URL` to route all auth requests — if it doesn't match the origin users actually browse to, every auth request will fail.

For non-localhost deployments (for example `http://hq.shank-home.net:3001`), set `AUTH_URL` to that exact public URL so Auth.js can trust and generate the correct auth endpoints. `AUTH_URL` must be an origin only (scheme + host + optional port), not a path like `/api/auth` or `/api/auth/callback/google`.

`AUTH_URL` must also match the origin registered as an authorized redirect URI in Google Cloud Console (the `<AUTH_URL>/api/auth/callback/google` entry). Scheme (`http` vs `https`), hostname, and port must all match exactly.

### OAuth troubleshooting (common misconfigurations)

- **`Unknown Action` from Auth.js** ← check this first
  - **This almost always means `AUTH_URL` is wrong.** Set `AUTH_URL` to the exact origin users browse to — for example `http://hq.shank-home.net:3001` — not `http://localhost:3000`.
  - `AUTH_URL` must match the origin in your Google Cloud authorized redirect URI (`<AUTH_URL>/api/auth/callback/google`).
  - `AUTH_URL` must be origin-only — do not include a path (e.g. `http://localhost:3000/api/auth` is wrong).
  - `HOST_PORT` in `.env` must match the port in `AUTH_URL` (e.g. both `3001` for the custom-host deployment).
  - Confirm route handler exists at `src/app/api/auth/[...nextauth]/route.ts`.
  - Visit `/api/auth/signin` in a browser to verify Auth.js can list the Google provider.
  - Use the in-app **Log in with Google** button — do not navigate directly to `/api/auth/signin/google?...`.

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

- **`JWTSessionError` / `Invalid Compact JWE` with login reload loops**
  - Ensure `AUTH_SECRET` is set and stable across restarts/deploys.
  - If you recently changed `AUTH_SECRET` or auth session settings, clear browser cookies for the app origin and sign in again.

- **`invalid_client` or OAuth client authentication failed**
  - Verify `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are from the same Google OAuth client.
  - Confirm there are no trailing spaces/quotes in `.env`.
