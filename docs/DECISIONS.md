# DECISIONS.md

Architecture decisions and the running log. Append, never rewrite history.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | NestJS | Fastest path for this developer. Module/DI structure keeps a timed build from sprawling. |
| ORM | Prisma | Schema-first. The data model is the product here, so the schema is the plan. |
| DB | PostgreSQL | Relational. Attribution is joins and aggregates. |
| Frontend | React + Vite | Vite for fast HMR under time pressure. |
| State | Zustand | Minimal ceremony, no provider tree. |
| Styling | Tailwind | Fastest route to a presentable UI without writing a design system. |

## Data model

Entities and the relationships that matter:

- `User` — auth identity. `role: COMPANY | CREATOR | ADMIN`.
- `Company` — brand profile. Has many `Campaign`.
- `CreatorProfile` — vertical, followerCount, country, language, pricePerPostCents,
  avgImpressions, engagementRate, headline, avatarUrl.
- `Campaign` — belongs to Company. objective, brief, keyMessages, guidelines,
  destinationUrl, budgetCents, status `DRAFT | LIVE | COMPLETED`, dates.
- `Booking` — the join that carries the deal. Campaign x CreatorProfile,
  agreedPriceCents, status `INVITED | ACCEPTED | DECLINED | DRAFT_READY |
  SCHEDULED | LIVE | PAID`.
- `Post` — belongs to Booking. linkedinUrl, content, publishedAt, impressions.
- `TrackedLink` — belongs to Booking. unique `slug`, resolved destinationUrl.
- `ClickEvent` — belongs to TrackedLink. createdAt, referrer, userAgent,
  ipHash, isLead.
- `Payout` — belongs to Booking. amountCents, status, paidAt.

Denormalise nothing at first. Dashboard numbers come from `groupBy` over
`ClickEvent`. If it is slow with seed data, add a rollup then, not before.

## Key decision: the tracked link is the spine

`GET /r/:slug` records a ClickEvent and 302s to the destination. Public, no auth,
no rate limit for the demo. Everything on the dashboard aggregates over that one
table. Build it early because it is what proves the clone works.

## Key decision: the frontend/backend hedge

All HTTP lives behind `apps/web/src/lib/api/`. That directory exports one typed
client interface with two implementations: `http` (real) and `fixtures` (static).
A single env flag picks one. If the brief turns out to be frontend-only, the
fixture client stands alone and the API is deleted with no refactor.

## Money

Integer cents everywhere. EUR. Format only at the render boundary.

## Running log

Append `YYYY-MM-DD — what changed and why` as you go. One line each.

- 2026-09-10 — Repo scaffolded. Stack chosen as above. Data model drafted from
  naano product research before the brief was opened.
- 2026-09-10 — Monorepo, Prisma schema + migration, seed (40 creators, 2
  companies, 4 campaigns, 19 bookings covering every BookingStatus, ~3k
  ClickEvents), NestJS app booted with working JWT auth (POST /auth/login +
  RolesGuard), a real GET /creators list endpoint, and GET /r/:slug tracking
  verified end to end against Postgres. campaigns/bookings/analytics are empty
  wired stub modules, deliberately, pending the brief. React app boots with the
  api-client hedge (http/fixtures behind one interface) and renders the
  creators list from the live API. Added `concurrently` (root devDependency,
  user-approved) so `npm run dev` runs both apps in one terminal on Windows.
  Windows-specific gotcha: `nest-cli.json`'s default `deleteOutDir: true`
  combined with TS incremental builds (`tsconfig.tsbuildinfo`) leaves a stale
  build-info cache pointing at deleted output, so `tsc`/`nest build` reports
  "0 errors" but writes nothing — set `deleteOutDir: false` to avoid it.
- 2026-09-10 — Scaffold review fixes. `audienceFitScore` dropped from
  `CreatorProfile` (migration `drop_audience_fit_score`); it is now computed per
  `(creator, campaign)` via `scoreAudienceFit` in `creators/audience-fit.ts`,
  wrapped by `CreatorsService.audienceFitScore()`, uncalled for now. Campaign has
  no `targetVertical` column yet (campaign flow still stubbed), so the scorer
  takes `{ targetVertical }` as an argument — wire it to a column when campaigns
  land. Global `ValidationPipe` now `forbidNonWhitelisted`; list DTOs extend
  `common/dto/pagination-query.dto.ts`, so unknown params (`limit`, `vertical`)
  400 naming the field. Creators grid paginates via Zustand `creatorsStore`
  (pageSize 12) + `CreatorsPagination`, driven by the envelope. Dev-only
  `GET /dev/tracked-links` added behind `NonProductionGuard` (404 in prod).
  Seed: name/headline pools widened (40 unique headlines, surnames capped at 2);
  price is now banded per follower tier (non-overlapping EUR bands 20→1500, no
  cross-tier inversions, scarce verticals skew high); `avgImpressions` rebalanced
  to 40–150% of followers (smaller creators higher) and ClickEvent volume scaled
  to 0.7–1.8% CTR (~5k events). React Router v7 future flags set.
- 2026-09-10 — New docs wired in. `docs/RECON.md` (direct walkthrough of the
  live brand app) supersedes `PRODUCT.md`; `docs/DESIGN.md` is a hard visual
  constraint file; `docs/PLAN.md` is the sliced build checklist and the
  session-to-session handoff. `CLAUDE.md` + `AGENTS.md` updated: both list the
  three docs, and both carry rules 6 (every component consumes tokens; screenshot
  and check against the anti-slop rules after each screen) and 7 (PLAN.md is read
  at the start and ticked at the end of every session).
- 2026-09-10 — Design token layer. Tokens from `docs/DESIGN.md` live once as CSS
  custom properties in `apps/web/src/index.css` (colour, two radii, one overlay
  shadow, type ramp, Inter stack). `tailwind.config.js` maps utilities onto them
  via `var()` (`bg-surface`, `text-muted`, `rounded-card`, `shadow-overlay`,
  named spacing `s1..s12`, the `page-title`/`metric`/… font sizes). Stock
  Tailwind palette left in place for now so the pre-token screens keep rendering;
  each migrates to tokens in its Phase 2 slice. Primitives in `components/ui/`
  rebuilt/added, tokens only: Button, Card, Input, Select, Checkbox, Badge,
  StatusPill, Table (+ THead/TBody/TR/TH/TD), Tabs, Modal (portal,
  Escape/backdrop close, the one allowed shadow), SegmentedBar. No screens built.
- 2026-09-10 — Playwright added as an `apps/web` dev dependency (explicit
  instruction). `npm run shot --workspace=apps/web -- <route> [name]` shoots the
  route at 1440px into `apps/web/.screenshots/` (gitignored) via
  `apps/web/scripts/shot.mjs`. Chromium pulled with `npx playwright install
  chromium`. MSYS/Git-Bash mangles a leading-`/` route arg into a Windows path —
  run it from PowerShell (the project's primary shell) or prefix
  `MSYS_NO_PATHCONV=1`.
- 2026-09-10 — Data model delta per `docs/RECON.md` §10 (migration
  `recon_data_model_delta`). `CreatorProfile`: dropped `avgImpressions`, added
  `medianViews`; renamed `pricePerPostCents` → `postCostCents`; added
  `bundle5PriceCents`, `network` (LINKEDIN|X), `observedEngagerCount`,
  `postsAnalyzed`. New models: `Icp` (campaign has up to three; `rank` 1..3
  unique per campaign), `AudienceSegment` (dimension
  JOB_TITLE|SENIORITY|INDUSTRY|GEOGRAPHY, label, percentage; 4 dims × 4 segments
  per creator, each dim sums to 100), `CreatorPost` (network, content,
  publishedAt, views, reactions, comments, reposts, externalUrl; 5 per creator).
  `Booking` gained `initiatedBy` (BRAND|CREATOR) for two-way invitations. CPM is
  `postCostCents / medianViews * 1000` — computed in `packages/shared/src/cpm.ts`
  (`cpmCents` / `cpmEur`), never stored. `audienceFitScore` unchanged (still a
  computed `(creator, campaign)` value). Reseed hits the calibration + volume
  targets: 40 creators all activated, 96 published posts, 184,141 impressions,
  7,514 engaged profiles, 12 ICPs, 115 bookings covering every status and both
  initiators; CPM 39/40 in EUR 10–30 (one scarce-vertical nano at 30.05), median
  views 25–92% of followers, post cost EUR 35–1,500, bundle ≈ 3.15–3.45× a
  single post. `migrate reset` was required (existing 40 rows blocked the new
  NOT NULL columns); demo seed data, so expected. Running API/dev processes hold
  the Prisma engine DLL on Windows — stop them before `prisma generate`/`migrate`.
- 2026-09-10 — Slice 2.3: `GET /creators` gained filters (vertical×N, country,
  price range, maxCpmEur, minMedianViews, min/max followers, minEngagementPct,
  postedWithinDays) and four sorts; `GET /creators/:id` returns
  `CreatorProfileDetail` (profile + audienceSegments ordered by dimension then
  %, + posts newest-first). Column filters run as one Prisma `where`; CPM is
  derived (`@naano/shared` `cpmEur`), so the max-CPM filter and the `best_match`
  blend run in memory over the full filtered set, then the array is paged —
  chosen over a two-path DB/in-memory split because the catalogue is ~40 rows.
  `best_match` (`creators/ranking.ts`) is a rank-normalised blend of CPM (0.5),
  median views (0.3), engagement (0.2); sector fit is deferred until Campaign
  carries a target vertical. Request/response contracts (`CreatorSort`,
  `ListCreatorsParams`, `CreatorProfileDetail`) added to
  `packages/shared/src/api.ts`. Web api client left untouched (slice was
  API-only).
- 2026-09-11 — `Campaign.targetVertical` (required `Vertical`) added. Per-
  (creator, campaign) ICP fit is now computed on the list endpoint:
  `GET /creators` takes optional `campaignId`; with none it ranks against the
  most recent LIVE campaign as the implicit brand context ("Ranked for your
  company", RECON §4), and rows come back as `MarketplaceCreator`
  (`CreatorProfile` + `icpFitPct: number | null`). `best_match` changed from a
  weighted fit/perf mix to **fit-band first, performance blend within the
  band** — RECON says sector fit comes first and performance only "refines",
  and `scoreAudienceFit` returns ~8 discrete values so banding is clean.
  `audience-fit.ts` is now called (was dead code).
- 2026-09-11 — `GET /creators?q=` free-text filter (case-insensitive contains
  over displayName + headline), added for the 2.4 search box. In the Prisma
  `where`, so it costs nothing extra.
- 2026-09-11 — Web consumes `@naano/shared` from **source** via a vite alias,
  and `packages/shared/src/index.ts` names the cpm re-export instead of
  `export *`. Rollup can't statically resolve runtime named exports through
  tsc's NodeNext CJS interop (`__exportStar` / `Object.defineProperty` getters),
  so importing `cpmCents` into the web bundle failed. The API keeps consuming
  `dist`. First real cross-app use of the shared CPM helper.
- 2026-09-11 — Shortlist started client-only: `shortlistStore` (zustand
  `persist` → localStorage `naano.shortlist`). Book and View profile both open
  a thin real `CreatorProfileModal` (backed by `GET /creators/:id`) so no card
  control is a dead button. `AppShell` rebuilt as the DESIGN §layout 72px icon
  rail.
- 2026-09-11 — Shortlist moved server-side and **campaign-scoped**. New
  `ShortlistItem` model (`@@unique([campaignId, creatorProfileId])`); routes
  `GET|POST /campaigns/:id/shortlist` (POST idempotent via upsert), `DELETE
  /.../:creatorId` (no-op if absent). New `CampaignsService.getActive()` (most
  recent LIVE, else most recent of any status) is the one place "the active
  campaign" is resolved — `CreatorsService` delegates to it for the no-campaign
  ranking path, and `GET /campaigns/active` exposes it so the web keys the
  shortlist to the same campaign without a campaign switcher. Chosen over a
  brand-scoped shortlist because the marketplace and the campaign Shortlist tab
  (3.5) must show the same rows. `shortlistStore` hydrates from the API on
  marketplace mount and writes optimistically (reverts on failure). No
  localStorage. `creators/mappers.ts` extracted so `ShortlistService` and
  `CreatorsService` share `toMarketplaceCreator`.
- 2026-09-11 — `prisma migrate reset` is local-only from here (CLAUDE.md); once
  a remote DB exists, forward migrations only. The `campaign_shortlist`
  migration is additive and applied without a reset — the reset that followed
  was purely to reseed shortlist rows.
- 2026-09-11 — Creator modal (2.9–2.11) is a two-column shell:
  `CreatorProfileModal` (header + tabs) beside a persistent `BookingRail`
  `<aside>`. `BookingRail` shows the single / bundle-of-5 radio (drives the
  estimated CPM live), typical reach, posts analysed, the literal CPM formula,
  and a "how booking works" summary — no "Collaborate" CTA and no `Booking`
  write yet (2.13). Content tab is 2.12, so the modal ships with two tabs, not
  three, rather than a placeholder tab. New `ui/Disclosure` primitive (styled
  `<details>` + chevron) replaces raw `<details>` markers. `ReachSparkline` is
  hand-rolled inline SVG — no charting dependency added.

- 2026-09-11 (Session B) — Marketplace filter panel (2.5, partial): industry
  (searchable multi-select), country (dropdown) and follower min/max, wired to
  the `vertical`/`country`/`minFollowers`/`maxFollowers` params `GET /creators`
  already exposed (slice 2.3). Deliberately narrower than the full 2.5+2.6
  scope — no price range/histogram, no performance-filters panel — per this
  session's assignment; recorded as a deferral on the PLAN 2.5/2.6 lines, not
  a silent scope cut. Active filters render as removable chips + one "Clear
  all"; the empty state distinguishes query-only / filters-only / both.
  `fixtures.ts` got matching filter logic so the http/fixtures hedge doesn't
  silently diverge. Verified against the live 40-creator seed before
  committing: `vertical=SALES` alone → 5; `vertical=SALES,DEVTOOLS` → 10;
  `country=PT` → 1, `country=FR` → 1; `minFollowers=75000` → 2 (of 40);
  `vertical=REVOPS,DEVTOOLS&country=IE&minFollowers=20000&maxFollowers=30000&q=build`
  → 1 (Maya Ferrari) — all matched hand-computed expectations from the raw
  seed data, and the UI's header count, section subtitle and pagination
  footer agreed with the grid in every case (checked directly in the browser,
  not just via the API). Shipped as two commits: filters wired to the API
  first, chips/clear-all/fixtures parity second, so a partial session leaves
  working filters on `main` rather than a polished control row attached to
  nothing.

## Session B

Deploy work on branch `deploy`, running on Railway. New files only
(`apps/{api,web}/Dockerfile`, `apps/{api,web}/railway.json`, `Caddyfile`,
`.dockerignore`, `.gitattributes`, `scripts/smoke.mjs`); the one shared-file
edit is `apps/api/src/main.ts` binding `0.0.0.0` explicitly. Everything below
is what the next session (or session A, hitting deploy for the first time)
needs to not lose an hour to.

- **Dockerfiles, not nixpacks.** The workspace monorepo needs a deterministic
  root `npm ci`, an explicit build order (`packages/shared` → `prisma
  generate` → the target app), a Prisma query-engine binary that matches the
  runtime base image, and a static-file server with SPA fallback for the web
  service. Nixpacks' auto-detection does not know any of those four things
  about a workspace monorepo; a Dockerfile makes each one an explicit,
  reviewable line.
- **Railpack cost two build cycles.** Railway's newer default builder
  (Railpack) was silently building both services from its own auto-detection
  — ignoring `apps/{api,web}/railway.json` — until the dashboard's Builder
  setting was switched to Dockerfile per service. The config-as-code path
  setting alone does not make Railway prefer the Dockerfile builder; the
  service's Builder setting has to say `DOCKERFILE` too. If a service is
  building but the logs don't look like the Dockerfile you're reading,
  check that setting first.
- **`apps/api/Dockerfile` cross-stage `node_modules` bug (found via the first
  real Railway build failing).** An earlier version ran `npm ci` in its own
  `deps` stage before the real source existed, then copied that
  `node_modules` into the `build` stage. npm workspace symlinks
  (`node_modules/@naano/shared`) and `prisma generate`'s output
  (`node_modules/.prisma/client`) are position/content-dependent and did not
  survive that — `nest build` failed with `TS2307` on `@naano/shared` and
  stub Prisma types (`no exported member 'Campaign'`). Fixed by dropping the
  `deps` stage: `npm ci` now runs in `build`, after the real source is
  copied in. Confirmed by inspection (a probe build printing the actual
  filesystem, not assumed): npm workspaces hoist everything to the **root**
  `node_modules` — `apps/api/node_modules` never exists — so both the
  generated Prisma client and the `@naano/shared` symlink live at
  `/app/node_modules`, which is what the runner stage copies from. Added a
  build-stage guard (`test -f node_modules/.prisma/client/index.js`) that
  fails the build loudly if the client isn't there, instead of surfacing as
  a confusing TS error two steps later. `apps/web/Dockerfile` never had the
  cross-stage copy (single build stage, runner only takes the static
  `dist/`), but had the same install-before-source ordering risk; reordered
  for consistency.
- **`VITE_API_URL` is inlined at BUILD time, not read at runtime.** Vite
  bakes `import.meta.env.VITE_API_URL` into the JS bundle when `vite build`
  runs (`apps/web/src/lib/api/http.ts` is the only place it's read). If the
  API's public URL ever changes, **the web service must be rebuilt**, not
  just restarted or redeployed without a rebuild — a restart keeps serving
  the old baked-in URL and looks like a CORS or network failure, not a stale
  build. `apps/web/Dockerfile` takes it as a build `ARG` and fails the build
  if it's empty, specifically so this can't silently ship a `localhost`
  fallback.
- **Railway's generated domain needs its target port to match the injected
  `PORT`, not the app's local dev port.** Both services bind
  `process.env.PORT` (API: `main.ts`; web: Caddy's `:{$PORT}` in the
  Caddyfile) — Railway injects that value (observed as 8080 on this
  project), which does not have to match `PORT=3000` in `.env.example` or
  Vite's dev port 5173. When generating a public domain for a service in the
  dashboard, the target port field must be set to the Railway-injected
  `PORT`, not a value copied from local dev — a mismatch here passes the
  build and then fails the healthcheck in a way that reads as an app bug.
- **`GET /dev/tracked-links` 404s under `NODE_ENV=production` — by design,
  not a bug.** `NonProductionGuard` (`apps/api/src/common/non-production.guard.ts`)
  guards that one route and 404s it whenever `NODE_ENV === "production"`,
  which is the correct setting for the deployed API. Don't spend time
  debugging that 404; it's confirmed working as intended (`scripts/smoke.mjs`
  asserts it).
- **The seed does not and cannot run inside the production API image.**
  `prisma:seed` is `ts-node prisma/seed.ts`; `ts-node` and `typescript` are
  devDependencies that the pruned runtime layer never installs (deliberately
  — see the Dockerfile comment). The seed is a one-time operation, run once
  from a developer machine against the public `DATABASE_URL` via `railway
  run`, which injects the connection string into the subprocess without it
  ever being typed, printed, or committed anywhere. `prisma migrate deploy`
  is run the same way, forward-only.
