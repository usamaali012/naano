# naano

A working rebuild of [naano.com](https://naano.com), a B2B marketplace that
connects brands with LinkedIn (and X) creators for sponsored posts. A brand
browses a ranked marketplace of creators, books a post or a bundle, and
tracks reach and clicks through a tracked link once the creator publishes.

## Live

- **Web:** _placeholder — Railway web service public URL_
- **API:** _placeholder — Railway API service public URL_

## Stack

| Layer | Choice |
|---|---|
| Backend | [NestJS](https://nestjs.com/) |
| ORM | [Prisma](https://www.prisma.io/) |
| Database | PostgreSQL |
| Frontend | React + [Vite](https://vitejs.dev/) + TypeScript |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Styling | Tailwind CSS |
| Deploy | [Railway](https://railway.app/) — one Dockerfile-built service per app |

Money is stored as integer cents (EUR), never floats. Every list endpoint is
paginated. See `docs/DECISIONS.md` for the full architecture log.

## Monorepo layout

```
apps/
  api/              NestJS API — REST endpoints, Prisma, JWT auth,
                     the public tracked-link redirect (GET /r/:slug).
  web/               React + Vite SPA — the marketplace, creator modal,
                     campaign and booking flows.
packages/
  shared/            Types shared by both apps (enums, entities, the wire
                     API contracts, and the one CPM formula), derived from
                     the Prisma schema. Built with `tsc`; the API consumes
                     the built dist, the web app consumes the source
                     directly via a Vite alias.
docs/                Product research, design constraints, the build plan,
                     the architecture decision log, and this repo's file map.
scripts/
  smoke.mjs          Post-deploy smoke test — see "Verifying a deployment"
                     below.
```

`packages/shared` is the source of truth handed down from
`apps/api/prisma/schema.prisma`: the schema drives the shared types, and both
apps import from there rather than redeclaring shapes.

## Running it locally

Prerequisites: Node 20+, npm, and a PostgreSQL instance (the repo's
`docker-compose.yml` will run one for you if you don't already have one).

```bash
# 1. Install every workspace from the repo root
npm install

# 2. Copy the env template (it holds both apps' vars under one file) and
#    split/fill it into each app's own .env
cp .env.example apps/api/.env      # keep DATABASE_URL, JWT_SECRET, IP_HASH_SALT, PORT, WEB_ORIGIN
cp .env.example apps/web/.env      # keep VITE_API_URL, VITE_API_MODE

# 3. Postgres (skip if you already have one running)
docker compose up -d

# 4. Build the shared package, then migrate + seed the database
npm run build:shared
npm run prisma:migrate    # prisma migrate dev
npm run prisma:seed       # 40 creators, 2 companies, 4 campaigns, realistic figures

# 5. Run both apps together
npm run dev                # API on :3000, web on :5173
```

Each app can also be run on its own: `npm run dev:api` / `npm run dev:web`.

The web app never calls `fetch` directly — every API call goes through
`apps/web/src/lib/api/`, which picks between a real HTTP client and a static
fixture client via `VITE_API_MODE`. That's the only place `VITE_API_URL` is
read.

## Deployment

Both services deploy to Railway from this repo's `Dockerfile`s (not
nixpacks) — see `docs/DECISIONS.md`, Session B, for why, and for the
cross-stage build gotchas that cost real time getting there.

- `apps/api/Dockerfile` + `apps/api/railway.json` — multi-stage build
  (install → `prisma generate` → `nest build` → pruned runtime layer).
  Binds `0.0.0.0:$PORT`. Healthcheck: `GET /health` (no database round trip).
- `apps/web/Dockerfile` + `apps/web/Caddyfile` + `apps/web/railway.json` —
  Vite build served as a static SPA by Caddy, bound to `$PORT`.
  **`VITE_API_URL` is inlined at build time**, not read at runtime — changing
  it requires rebuilding the web service, not just restarting it.
- Database migrations run forward-only in production: `prisma migrate
  deploy`, never `migrate reset`. The seed script (`ts-node`) only runs from
  a developer machine against the public `DATABASE_URL`, via `railway run`,
  since `ts-node` is a devDependency the production image deliberately
  doesn't install.

### Verifying a deployment

```bash
node scripts/smoke.mjs <api-base-url>
```

No setup, no dependencies beyond Node's built-in `fetch`. Checks the health
endpoint, that all 40 seeded creators are reachable, that both a seeded
brand and a seeded creator account can log in, and that the dev-only
inspection route is correctly locked down in production. Prints one
pass/fail line per check and exits non-zero on any failure.

---

## What shipped first

_placeholder — filled in separately._

## What was deliberately cut

_placeholder — filled in separately._

## Agent-log disclosure

_placeholder — filled in separately._
