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
