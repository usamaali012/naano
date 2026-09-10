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
- 2026-09-11 — Creator avatars are real photos, not initials. Seed writes
  `avatarUrl` = `randomuser.me/api/portraits/{gender}/{n}.jpg` (static JPEG CDN,
  no API call): portrait number `(index*7+13) % 100` gives 40 distinct photos,
  gender from a `FEMININE_NAMES` set so the face matches the name. Chosen over
  pravatar (`?u=`) for a static CDN and guaranteed no repeats across the 40.
  New `ui/Avatar` renders `<img>` with `onError` -> an initials block; initials
  are the fallback, never the default. The creator profile row now gets an
  explicit `id` in seed so it's stable within a run.
- 2026-09-11 — `Disclosure` is controlled (`useState` + `onToggle`), not
  `open={defaultOpen}`. An uncontrolled `<details>` inside a component that
  re-renders on unrelated state (the booking-rail price radio) could snap shut;
  controlling `open` keeps it and guarantees the body re-renders with current
  props. `BookingRail` also adds a "Selected €X (N posts)" row and spells out
  the bundle ÷5 step, so radio + price + estimated CPM + formula visibly agree.
- 2026-09-11 — Marketplace `loading` / `error` states are framed panels inside
  the shell, not bare `<p>`. Error copy is in-product voice ("The marketplace
  didn't load"), no mention of the API, with a "Try again" action that bumps a
  `reloadKey` (in the fetch effect deps) and re-hydrates the shortlist.
- 2026-09-11 — The card fit badge is **"N% sector fit"**, and the wire field is
  `sectorFitPct` (renamed from `icpFitPct` across `@naano/shared`, the API,
  `mappers.ts`, and the web). It measures `creator.vertical ===
  campaign.targetVertical` — the creator's own sector match with the campaign,
  not their audience mix — which the old "ICP fit" label implied and
  contradicted the Audience tab. `audience-fit.ts` scoring is unchanged; only
  names and copy moved.
- 2026-09-11 — naano is LinkedIn-only (RECON). Seed forces every creator and
  every post to `Network.LINKEDIN`; the `crossPosts` mechanic is removed. The
  `Network` enum keeps `X` and `NetworkBadge` still renders it — the seed just
  never produces non-LinkedIn rows.
- 2026-09-11 — `LAST_NAMES` widened to 44 and indexed directly (no modulo), so
  all 40 creators get a distinct surname. Avatar gender stays keyed on the
  first name.
- 2026-09-11 — `apps/web/scripts/shots.mjs` (`npm run shots`) is the canonical
  screenshot suite: wipes `.screenshots/`, reshoots grid + both modal tabs +
  booking rail + error state, prints mtimes. Regenerating all of it is part of
  finishing a UI task.
- 2026-09-11 — `ui/Avatar` reworked: initials render underneath the `<img>`
  always (not only after `onError`), and `loading="lazy"` was dropped. A
  fullPage Playwright screenshot right after navigation was catching randomuser
  images mid-load — neither the photo nor the fallback had painted yet, so 12
  cards showed empty circles. Initials-as-background degrades a slow or failed
  load the same way; `shots.mjs` also now waits for `document.images` to settle
  before every shot.
- 2026-09-11 — Post cost clamp removed (`CLAMP_COST_MIN_EUR`/`MAX_EUR`,
  seed.ts). It was inventing a floor/ceiling docs/RECON.md §10 never asked for,
  and it was visibly binding (two creators at exactly EUR 1,500). Cost is now
  purely `cpm * medianViews / 1000`; the four `TIER_BANDS` were narrowed to a
  believable B2B follower range (18K-215K, was 1K-480K) so the unclamped result
  stays plausible on its own (EUR 255-986 this reseed). A `usedPostCosts`
  module-level `Set` plus a "nudge off any multiple of 25" step guarantee no
  two creators share a price and none lands on a round figure; CPM stays in
  the RECON EUR 10-30 band because tier CPM ranges carry 2+ EUR of headroom
  before the nudge could push a value out.
- 2026-09-11 — Marketplace section subtitle no longer claims "The 40 strongest
  profiles" when there are exactly 40 total (a vacuous "top 40 of 40" next to
  "Showing 1-12 of 40"). Now "All {totalCount} creators, ordered by sector fit
  then verified performance"; the ranked-view section heading changed from
  "Top ranked creators" to "Best match first" for the same reason — true at
  any catalogue size, not just when the shown set is a subset.
- 2026-09-11 — `/` is now a real demo entry (slice 6.2), not a placeholder
  "Enter the app" link. `EntryPage` (replaces `PublicHome`) offers two
  one-click sign-ins against seeded accounts — brand (Ledgerly, the company
  that owns the live campaign the marketplace already ranks against) and
  creator (seed index 0) — each doing a genuine `POST /auth/login` +
  `GET /auth/me` (new endpoint), not a faked session. `authStore` (zustand
  persist) holds the JWT + the `/me` result; `apps/web/src/lib/api/http.ts`
  attaches it as a Bearer header via `setApiToken`. `App.tsx`'s `AppIndex`
  routes by role: brand -> the marketplace (already fully built), creator ->
  new `CreatorHomePage`, a real page showing the signed-in creator their own
  `GET /creators/:id` ("this is exactly how brands see you") — the honest
  stand-in until Phase 4 builds the actual creator side. `/app` redirects
  signed-out visitors to `/`. `AppShell` gained a top bar (identity + Sign
  out) so the login is visible, not just functional.
