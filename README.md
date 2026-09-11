# naano

A working rebuild of [naano.com](https://naano.com), a B2B marketplace that
connects brands with LinkedIn (and X) creators for sponsored posts. A brand
browses a ranked marketplace of creators, books a post or a bundle, and
tracks reach and clicks through a tracked link once the creator publishes.

## Live

- **Web:** https://web-production-b94cd.up.railway.app
- **API:** https://api-production-f367c.up.railway.app

Both open for a signed-out visitor. `/` offers a one-click sign-in as the
demo brand or the demo creator.

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

The core loop, end to end, before anything else:

1. **Data truth.** 40 seeded creators with realistic figures (followers,
   median views, CPM, post cost, audience breakdown, five recent posts
   each) driven by `docs/RECON.md`'s calibration targets, not lorem ipsum.
2. **The marketplace.** A ranked grid — sector fit first, verified
   performance second — with a real search box, four sort modes, and
   filters (industry multi-select, country, follower range) that hide
   creators against live `GET /creators` query params, not client-side
   fakes.
3. **The creator profile modal.** Audience composition, content
   performance (a pageable post history — full text, engagement, the
   original link), and a booking rail with live pricing (single post vs.
   bundle of five) and the literal CPM formula.
4. **Real two-sided bookings.** A brand books a creator; the creator
   accepts or declines from their own real sign-in; accepting mints a
   `TrackedLink` and surfaces it to the creator with a copy button.
5. **Real click tracking.** `GET /r/:slug` records every click and 302s to
   the campaign's destination; a brand sees the running click count on
   the creator's card and in the Collaborations table.
6. **Collaborations.** The brand-side table of every booking — creator,
   campaign, package, price, status, tracked link and its click count —
   with a status filter and pagination.
7. **A seeded, role-aware demo entry (`/`).** One click signs a visitor in
   as the demo brand or the demo creator; each lands on the surface that
   role actually sees (marketplace + Collaborations for a brand, their own
   profile and bookings for a creator).
8. **Deployed.** Both services run on Railway from this repo's
   Dockerfiles — see "Deployment" above.

Then, once the loop was closed, one more screen: **attribution by
creator.** Results aggregates real `ClickEvent` rows into clicks per
creator, alongside accepted-booking counts and the time of the last click.
Server-side aggregates, paginated like every other list, no charting
dependency. It exists because the entry page promises "trace every click"
and nothing else in the product paid that off as a screen you could open.

## What was deliberately cut

Named out loud rather than left to be discovered:

- The agency side of the marketplace entirely.
- Real payment rails — a wallet UI may exist, but balances are never real
  money moving.
- The AI Matching conversational mode; the marketplace stays a browsable,
  filterable grid.
- The conversion pixel (a layer above click tracking) — click tracking
  itself is real and verified end to end.
- LinkedIn OAuth and any real LinkedIn API — post URLs and content are
  seeded, not fetched.
- Messages between brands and creators.
- The Leads tab and ICP account enrichment.
- The MCP / Connect server.
- i18n, the blog, and the SEO page tree.
- The rest of the analytics dashboard: metric cards and a daily-clicks
  time series. Attribution by creator shipped because it closes the
  tracked-link loop; charts drawn over data I seeded myself would only
  have proved that I can draw a chart.
- The floating AI command bar seen on the live product — left out rather
  than shipped as a non-functional signature element.

The standing rule behind all of it: a control that renders but doesn't do
anything is worse than no control. Everything above either doesn't render,
or wasn't started.

## What is not finished, honestly

**The creator side is a considered guess.** I walked the brand side of the
real product directly. I never saw the creator side. The creator home
screen shows a creator their own profile exactly as brands see it, plus
their bookings and the tracked link for each accepted one. That is a
reasonable shape for it, not a reconstruction of the real one, and I would
not claim otherwise.

**Sector fit is narrower than it looks.** The badge scores the creator's
own vertical against the campaign's target vertical. It is not derived
from the audience industry mix shown on the Audience tab, so the two can
disagree for the same creator. Deriving fit from audience composition is
the more honest version and I did not have time for it.

**Search matches name and headline, not industry.** Typing an industry
word into the search box will not find every creator in that industry; the
industry filter is what does that. The two should agree and they do not
yet.

**Campaign context is implicit.** The marketplace ranks against the
company's most recent live campaign. There is no campaign switcher,
because there are no campaign screens.

**Tracked-link destinations are `example.com` paths.** The redirect and
the click recording are real and verified end to end. The page a link
lands on is a placeholder, because the plumbing was the point.

**There are no tests.** In a build this short I chose hand-verification, a
Playwright screenshot suite that regenerates on every change, and a smoke
script that runs against the deployed API. That is a real tradeoff, not an
oversight, and it is the first thing I would add.

## Disclosures

### Agent logs

This repo was built with AI coding agents (Claude Code; see `AGENTS.md` for
the full working convention) rather than typed by hand end to end. Every
session's prompts and responses are captured automatically under
`.agent-logs/`, one append-only file per session
(`YYYY-MM-DD_HH-MM-SS_<session-id>.md`), so the full history of what was
asked for and what was built in response is auditable rather than
summarized after the fact. `docs/DECISIONS.md`'s running log and
`docs/PLAN.md`'s per-slice notes are the human-readable index into that
history — they cite the reasoning; the `.agent-logs/` transcripts are the
record it was derived from.

### The demo password is in the repo on purpose

Every seeded account shares one password, hardcoded in
`apps/web/src/routes/EntryPage.tsx`, so a reviewer can sign in as either
side without being handed credentials. That is the right call for a seeded
demo and the wrong call for anything real.

### The logs cover implementation, not everything

Planning, research, review of my own output and the merge coordination
between parallel sessions happened in a separate Claude conversation that
this hook does not capture. `.agent-logs/` is an honest record of what was
built, not of everything that was thought.

### Some early sessions are backfilled

The scaffold was built before I opened the brief. Those sessions were
reconstructed from on-disk transcripts after the fact and are marked
`backfilled: true`. Everything from the brief onward was captured live by
the hook as it happened.
