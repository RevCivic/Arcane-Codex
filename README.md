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

### AI gateway

Chat and character generation use the shared, OpenAI-compatible
[RevCivic AI gateway](https://github.com/RevCivic/ai-gateway). Arcane Codex sends
the admin prompt, active lore, and relevant character data with each request, so
campaign context stays in this application while model providers and routing stay
in the gateway.

Configure `AI_GATEWAY_URL` with the home-lab gateway's network-reachable URL and
set `AI_GATEWAY_MODEL` to one of its routing classes: `fast`, `balanced`, `heavy`,
or `background`. Arcane Codex defaults to `balanced`. Set
`AI_GATEWAY_API_KEY` when the gateway requires bearer authentication. The URL can
be an origin, a `/v1` base URL, or a complete `/v1/chat/completions` URL. Docker
Compose runs only the application and PostgreSQL; it does not pull or host a model.

For deployments that manage connection details separately, leave `AI_GATEWAY_URL`
blank and set `AI_GATEWAY_HOST` (a DNS hostname, IPv4 address, or IPv6 address) and
`AI_GATEWAY_PORT` instead. `AI_GATEWAY_PROTOCOL` defaults to `http` and can be set
to `https`. A configured `AI_GATEWAY_URL` takes precedence over these split values.

### Exporting deployment logs

On the Docker host, export the logs from every container in the Portainer/Compose
stack to `/mnt/38tb/containers/arcane-codex-deploy.log` with:

```bash
./scripts/export-deployment-logs.sh
```

The script includes stopped containers and combines each container's standard
output and standard error. If the stack has a different project name in Portainer,
set it explicitly:

```bash
PORTAINER_STACK_NAME=my-stack ./scripts/export-deployment-logs.sh
```

An alternate output path can be supplied as the first argument.

### Troubleshooting gateway authentication

An `AI gateway request failed (401)` message means the app reached the gateway,
but the gateway rejected its credentials; it is not a slow or incomplete Arcane
Codex deployment. Set `AI_GATEWAY_API_KEY` to a key issued by the gateway in the
Portainer stack environment and recreate the app container so Compose passes the
updated value into it. Restarting an existing container does not apply changed
environment variables.

Confirm that the variable is present without printing the secret:

```bash
docker compose exec app sh -c 'test -n "$AI_GATEWAY_API_KEY" && echo "AI gateway key is configured" || echo "AI gateway key is missing"'
```

If it is present and requests still return 401, replace it with a currently valid
gateway-issued key and recreate the app service:

```bash
docker compose up -d --force-recreate app
```

An `Unknown model class` response means `AI_GATEWAY_MODEL` does not match a
gateway routing class. Older deployments defaulted this value to `default`, which
the gateway does not support. Change it to `balanced` (recommended for chat),
`fast`, `heavy`, or `background`, and then recreate the app service.

Arcane Codex accepts standard chat-completion message content, structured text
content blocks, legacy completion text, and the gateway's top-level `response` or
`output_text` fields. If an empty response reports that `completion_tokens` equals
the requested `max_tokens`, the model likely spent its allowance before producing
visible text (this is common with reasoning models and large campaign prompts).
Arcane Codex retries that response once with a larger allowance. Set
`AI_MAX_TOKENS` higher if this happens frequently; `2000` is the default.

If the retry is also empty, the application logs the response status, content type,
and at most 4,000 characters of the gateway response body. Gateway responses may
contain campaign content, so restrict production log access appropriately.

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

Accepted, edited, and rejected suggestions are still stored locally for campaign
auditing. Model training and evaluation are managed by the gateway rather than by
Arcane Codex.

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

Each player user can claim multiple characters. Once claimed, each character is linked to that user's Google account email.

| Actor | What they can do |
|-------|-----------------|
| **USER** (unclaimed) | Browse all characters; claim any unclaimed character |
| **USER** (owner) | View + edit their own character sheet; unclaim their character |
| **ADMIN** | View + edit any character sheet; assign or clear any claim from the admin assign form on the character detail page |

Rules:
- One player can be assigned multiple characters; each character can be assigned to one player.
- A user can claim any number of currently unclaimed characters.
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

> **Important:** `Failed to find Server Action` and Auth.js `UnknownAction` are
> different errors. A missing Server Action means the browser submitted an action
> identifier from a different build (usually stale cached HTML or mixed app
> replicas). `UnknownAction` means Auth.js received an unsupported auth action.

For non-localhost deployments (for example `http://hq.shank-home.net:3001`), set `AUTH_URL` to that exact public URL so Auth.js can trust and generate the correct auth endpoints. `AUTH_URL` must be an origin only (scheme + host + optional port), not a path like `/api/auth` or `/api/auth/callback/google`.

`AUTH_URL` must also match the origin registered as an authorized redirect URI in Google Cloud Console (the `<AUTH_URL>/api/auth/callback/google` entry). Scheme (`http` vs `https`), hostname, and port must all match exactly.

### OAuth troubleshooting (common misconfigurations)

- **`Failed to find Server Action "x"` from Next.js**
  - This is not an allowlist decision. It means the submitted page came from an older/newer build than the container which handled the request.
  - Arcane Codex starts login through the stable `/login/google` route, so rebuild and redeploy the current image before troubleshooting an old image.
  - Remove any proxy/CDN cache for `/login` and restart every app replica. Make sure all replicas run the same image digest; do not mix old and new containers behind a load balancer.
  - Reload `/login` without cache (or clear site data). A service worker or restored browser tab can retain old HTML.

- **`UnknownAction` from Auth.js**
  - Use `/login` (which starts OAuth at `/login/google`) rather than constructing a provider URL manually.

- **Wrong callback host, cookie errors, or Google redirect mismatch**
  - Set `AUTH_URL` to the exact origin users browse to — for example `http://hq.shank-home.net:3001` — not `http://localhost:3000`.
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

- **Login succeeds with Google but Auth.js logs `AccessDenied`**
  - Arcane Codex returns this error when Google's normalized email has no row in the PostgreSQL `AllowedEmail` table.
  - After host cleanup, first verify that Compose mounted the original database volume: `docker compose ps`, then `docker volume ls | grep postgres_data`. Portainer stack/project renames can create a new, empty namespaced volume; volume pruning can remove an unattached volume.
  - Check the live allowlist without printing passwords: `docker compose exec db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-arcane_codex}" -c 'SELECT email, role FROM "AllowedEmail" ORDER BY email;'`.
  - If the expected rows and campaign data are missing, stop the stack and restore/reattach the original PostgreSQL volume or restore a backup. Do **not** run `prisma db seed` against a populated production database: this project's development seed deletes and recreates campaign data.
  - If only an allowlist row is missing, insert the normalized lowercase email directly while locked out: `docker compose exec db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-arcane_codex}" -c \"INSERT INTO \\\"AllowedEmail\\\" (email, role, \\\"createdAt\\\", \\\"updatedAt\\\") VALUES ('admin@example.com', 'ADMIN', NOW(), NOW()) ON CONFLICT (email) DO UPDATE SET role = EXCLUDED.role, \\\"updatedAt\\\" = NOW();\"`. Replace the example address, then clear the app's cookies and sign in again.

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

### Google Sheets write-back (DB → Sheet sync)

Reading from the Google Sheet (Sheet → DB) works with a public sheet, but if you want
hyperlink metadata (for example an image URL linked on a name cell) imported into the DB,
configure a Google Service Account as below so the app can use the Sheets API.

Writing back to the sheet (DB → Sheet) requires a **Google Service Account** with Editor
access on the spreadsheet. The **⬆ DB → Sheet** button on the Characters page will only
work once this is configured.

**One-time setup:**

1. In [Google Cloud Console](https://console.cloud.google.com/) open (or create) your project.
2. Go to **APIs & Services** → **Enabled APIs** and enable the **Google Sheets API**.
3. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **Service account**.
4. Give it a name (e.g. `arcane-codex-sync`) and click **Done**.
5. Open the new service account, go to the **Keys** tab, click **Add Key** → **Create new key** → **JSON**. Download the key file.
6. Open the Google Sheet you want to write back to. Click **Share**, enter the service account email (looks like `name@project.iam.gserviceaccount.com`), and grant it **Editor** access.
7. Add the credentials to your `.env`:

   **Option A** — paste the entire JSON key file as one line:
   ```
   GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","client_email":"name@project.iam.gserviceaccount.com","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",...}
   ```

   **Option B** — set the two key fields separately:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=name@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEv...\n-----END PRIVATE KEY-----\n
   ```

> **Note:** The write-back only updates cells in columns that already exist in the sheet.
> No new columns or rows are ever added. Characters in the database that do not appear in
> the sheet (matched by name) are silently skipped.
