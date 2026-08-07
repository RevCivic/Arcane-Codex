# AGENTS.md — Arcane Codex

## Project Overview

**Arcane Codex** is a web application for the "Arcane P.I." BRP (Basic Roleplaying) TTRPG campaign. The setting is a modern world where the supernatural is real. The app's goals are:

1. **Simplify mechanics** — keep gameplay focused on roleplay by surfacing BRP rules in a clean UI.
2. **Campaign database** — a single source of truth for characters, items, places, powers, and events.
3. **AI assistance** — lightweight AI (text + BRP stat/skill suggestions) to help the DM generate character data on the fly.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 |
| ORM | Prisma 7 (PostgreSQL) |
| Auth | Auth.js / next-auth v5 — Google OAuth, email allowlist |
| AI service | Python (FastAPI) microservice (`ai-service/`) backed by Ollama |
| LLM runtime | Ollama (`ollama/ollama`) — self-hosted, CPU or GPU |
| Runtime | Node 20+ / Docker Compose |

---

## Repository Structure

```
/
├── src/
│   ├── app/
│   │   ├── actions.ts          # All Next.js Server Actions (main business logic)
│   │   ├── layout.tsx          # Root layout + nav
│   │   ├── page.tsx            # Home / dashboard
│   │   ├── admin/              # Admin-only pages (access, ai, lore, skills, tags)
│   │   ├── characters/         # Character list, detail, sheet, chat
│   │   ├── chat/               # Global AI chat page
│   │   ├── events/             # Campaign event log
│   │   ├── inventory/          # Item / inventory management
│   │   ├── my-character/       # Player's own character redirect
│   │   ├── places/             # Location database
│   │   └── powers/             # Supernatural powers registry
│   ├── components/             # Shared React components
│   ├── lib/
│   │   ├── prisma.ts           # Prisma client singleton
│   │   ├── aiPromptContext.ts  # Structured AI prompt context helpers
│   │   └── ...
│   ├── types/                  # Shared TypeScript types
│   ├── auth.ts                 # Auth.js configuration
│   └── auth.config.ts
├── prisma/
│   ├── schema.prisma           # Database schema
│   ├── seed.ts                 # Default seed data (skills, etc.)
│   └── migrations/
├── ai-service/
│   ├── app.py                  # Flask AI microservice
│   ├── requirements.txt
│   └── Dockerfile
├── scripts/
│   ├── migrate-sqlite-to-postgres.ts
│   └── trigger-ai-retrain.ts
├── docker-compose.yml
└── .env.example
```

---

## Data Model (Key Entities)

### Characters (`Character`)
Central entity. Fields include name, race, gender, age, role, description, affiliation, currentCase, currentLocation, imageUrl, status, and an optional `claimedByEmail` (one user → one character, 1:1).

### Character Sheet (`CharacterSheet`)
BRP primary characteristics and derived stats for a character:
- **Primary**: STR, CON, SIZ, DEX, INT (stored as `intelligence`), POW, CHA, APP, EDU
- **Derived**: currentHp/maxHp, currentSanity/maxSanity, currentMp/maxMp, luck, build
- **Free-text**: wounds, notes

### Skills (`Skill` / `CharacterSkillValue`)
`Skill` is a global admin-managed definition (name, category, baseValue %, description, sortOrder).
`CharacterSkillValue` is a per-character override. `markedForImprovement` is set on FAILURE/FUMBLE rolls and cleared after post-mission improvement rolls.

### Powers (`Power` / `CharacterPower` / `CharacterAbility`)
`Power` is a global definition with an optional rollable `baseAbility` (percentile).
`CharacterPower` assigns a power to a character with a flat `modifier`.
`CharacterAbility` tracks a character's current proficiency for each rollable ability and supports improvement marking the same way skills do.

### Roll History (`RollHistory`)
Persisted d100 roll records. `rollType` is one of `ability | skill | power | free`. Stores the raw roll, effective target, difficulty tier, result type (`CRITICAL | SUCCESS | FAILURE | FUMBLE`), and optional luck spend.

### AI / Lore
- `LoreDocument` — world-building docs (Markdown); active documents are injected into every AI generation and chat prompt.
- `AIGeneration` — stored suggestions before user accept/edit/reject.
- `AIFeedback` — human feedback used for model retraining.
- `AIConfig` — key-value store for admin-configurable AI behaviour (e.g. `primaryPrompt`).
- `ChatSession` / `ChatMessage` — persisted AI chat threads (global `/chat` and per-character `/characters/[id]/chat`).

### Access Control
`AllowedEmail` with `AccessRole` enum (`USER | ADMIN`). Only allowlisted emails can sign in. Admins manage the list at `/admin/access`.

---

## Development Setup

### Local (non-Docker)

```bash
npm install
cp .env.example .env
# Edit DATABASE_URL to point to a local PostgreSQL instance
npx prisma migrate dev        # Apply migrations + seed
npx prisma generate           # MUST run before `npm run build` on fresh clones
npm run dev                   # Start Next.js dev server on :3000
```

### Docker Compose (recommended)

```bash
cp .env.example .env
docker compose up -d          # Starts app + db + ai + ollama containers
```

> **First run:** The `ollama-init` container will automatically pull the configured
> model (default: `llama3.1:8b-instruct-q4_K_M`, ~5 GB download). The `ai` service
> starts after the model is ready. Subsequent starts are fast — the model is cached in
> the `ollama_models` Docker volume.
>
> **To switch models** (e.g. to the 70B version for higher quality): set
> `OLLAMA_MODEL=llama3.1:70b-instruct-q4_K_M` in your `.env`, then run
> `docker compose run --rm ollama-init` to pull the new model, and
> `docker compose restart ai` to pick it up.

For GPU-accelerated AI (requires NVIDIA drivers + nvidia-container-toolkit):
```bash
docker compose --profile gpu up -d ollama-gpu ollama-init ai-gpu app db
# Set AI_MODE=gpu, AI_SERVICE_URL=http://ai-gpu:8000,
# OLLAMA_BASE_URL=http://ollama-gpu:11434, and OLLAMA_NUM_GPU_LAYERS=-1 in .env
```

---

## NPM Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Next.js development server |
| `npm run build` | Production build (run `npx prisma generate` first) |
| `npm run lint` | ESLint |
| `npm run ai:retrain` | Trigger AI model retraining via the admin API |
| `npm run db:migrate:sqlite-to-postgres` | One-time SQLite → PostgreSQL migration |

---

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `AUTH_SECRET` | Auth.js JWT secret (must be stable across restarts) |
| `AUTH_URL` | Public origin of the app (e.g. `http://localhost:3000`) — **must match Google's authorized redirect URI** |
| `AUTH_TRUST_HOST` | Set `true` behind Docker / reverse proxies |
| `AI_SERVICE_URL` | URL of the FastAPI AI microservice (default `http://ai:8000`) |
| `AI_MODE` | `cpu` or `gpu` |
| `OLLAMA_BASE_URL` | URL of the Ollama service (default `http://ollama:11434`) |
| `OLLAMA_MODEL` | Ollama model tag to use (default `llama3.1:8b-instruct-q4_K_M`) |
| `OLLAMA_NUM_GPU_LAYERS` | GPU layer offload count: `-1` = auto, `0` = CPU-only |
| `AI_RETRAIN_TOKEN` | Secret for the `/api/admin/ai/retrain` endpoint |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Service Account JSON for Sheets write-back (optional) |

---

## AI Service (`ai-service/app.py`)

A Python FastAPI microservice that handles all AI generation, backed by a local **Ollama** instance. It is **not** used for image generation.

- **Chat** — multi-turn conversation assistant grounded in active lore documents, campaign context, and optional per-character context. Uses Ollama (`/v1/chat`) with a full system prompt.
- **Character text generation** — backstory, personality, description (uses Ollama JSON mode, falls back to pattern engine if Ollama is unavailable)
- **BRP stat/skill suggestions** — full CharacterSheet suggestions (uses Ollama JSON mode, falls back to deterministic template engine)
- **Bulk text generation** — batch NPC creation (pattern engine; Ollama integration can be added later)

When `OLLAMA_BASE_URL` is set, all endpoints call Ollama first and fall back to the built-in pattern-matching engine only on error. This means the service remains functional even if Ollama is temporarily unavailable or the model is still being pulled.

Prompts are assembled from:
1. Active `LoreDocument` summaries (world-building context)
2. The admin-configured `primaryPrompt` from `AIConfig`
3. Structured `promptContext` fields (`entityType`, `tone`, `relationship`, `threat`, `alignment`, `nature`, `mechanicalFocus`) — defined in `src/lib/aiPromptContext.ts`

To trigger manual retraining:
```bash
APP_URL=http://localhost:3000 AI_RETRAIN_TOKEN=<token> npm run ai:retrain
```

Admins can also trigger retraining and review AI evaluation snapshots at **Admin → AI / Language Model**.

---

## Key Conventions

- **Server Actions** — all mutations and data fetching are in `src/app/actions.ts`. Avoid adding API routes for data that can go through Server Actions.
- **Admin-only routes** — everything under `src/app/admin/` is protected; the middleware in `middleware.ts` and Auth.js handle role checks.
- **BRP rules** — keep mechanics faithful to Basic Roleplaying: percentile skills, d100 rolls with CRITICAL/SUCCESS/FAILURE/FUMBLE tiers, luck spend, improvement rolls on FAILURE/FUMBLE.
- **Schema changes** — always create a Prisma migration (`npx prisma migrate dev --name <description>`) rather than editing the database directly. Run `npx prisma generate` after schema changes.
- **One claim per user** — a user can claim exactly one character. Admins cannot claim characters themselves.
- **Lore in every AI prompt** — when writing new AI generation code, pull active `LoreDocument` records and inject them as context so the AI stays grounded in the "Arcane P.I." setting.
- **Feedback loop** — AI suggestions should go through `AIGeneration` → `AIFeedback` so accepted/edited results can feed model retraining.

---

## Common Tasks for Agents

### Adding a new entity (e.g. "Faction")
1. Add the Prisma model to `prisma/schema.prisma`.
2. Run `npx prisma migrate dev --name add-faction`.
3. Run `npx prisma generate`.
4. Add Server Actions in `src/app/actions.ts` (create, read, update, delete).
5. Add pages under `src/app/factions/`.
6. If the entity should appear in AI context, add a relation to `LoreDocument` or handle it in `aiPromptContext.ts`.

### Adding a new AI generation type
1. Add the new enum value to `AIGenerationType` in `schema.prisma` and migrate.
2. Add a prompt builder in `src/lib/aiPromptContext.ts`.
3. Add a new endpoint or extend `app.py` in the AI service.
4. Wire up a Server Action in `actions.ts` that calls the AI service and stores the result in `AIGeneration`.
5. Add UI for accept/edit/reject feedback so results can be trained on.

### Modifying BRP mechanics (rolls, skills, derived stats)
- Roll logic lives in the character sheet page and the `RollHistory` Server Actions in `actions.ts`.
- Skill improvement tracking (`markedForImprovement`) is on both `CharacterSkillValue` and `CharacterAbility`.
- Keep difficulty tiers and result labels consistent with existing `RollHistory` records.
