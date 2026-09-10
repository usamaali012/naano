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
