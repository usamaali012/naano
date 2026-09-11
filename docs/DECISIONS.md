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
- 2026-09-11 — Accept issues a TrackedLink (slice 4.3). `BookingsService
  .updateStatus` mints the `TrackedLink` in the same `$transaction` as the
  ACCEPTED write when status is ACCEPTED (DECLINED short-circuits before the
  transaction, unchanged otherwise) — `destinationUrl` is copied from the
  booking's own campaign, never accepted from the client. Slug is
  `generateTrackedLinkSlug()` (`tracking/slug.ts`): 9 random bytes,
  base64url, 72 bits — no retry-on-collision logic, the odds don't justify
  it. Shared `Booking` type gained `trackedLinkSlug: string | null` and
  `clickCount: number | null`, populated wherever a booking is read
  (`create`/`listReceived`/`listSent`/`updateStatus`) via a
  `trackedLink: { select: { slug, _count: { clickEvents } } }` include
  (`TRACKED_LINK_SELECT` in `bookings.service.ts`) — chosen over a
  separate response type so `BookingReceived` and the brand's `listSent`
  both get it for free. Creator side: `CreatorHomePage` shows the full
  `/r/:slug` URL (`lib/trackedLink.ts` builds it from `VITE_API_URL`) with a
  working copy button per booking that has one. Brand side: `CreatorCard`
  shows "N clicks" next to the existing booking-status pill once a booking
  has a link — the cheapest surface per an explicit ask, no new
  Collaborations-style page. Verified end to end against the running API:
  created a booking (Ledgerly → Rafael Krause), accepted it as Rafael,
  hit `/r/<slug>` three times (each a real 302 to the campaign's
  `destinationUrl`), and confirmed both `GET /bookings/sent` (brand) and
  `GET /bookings/received` (creator) read back `clickCount: 3`. `fixtures.ts`
  keeps the hedge: `createBooking` sets both new fields null, and
  `updateBookingStatus` mints a fixture slug + `clickCount: 0` on accept.
- 2026-09-11 — `POST /dev/bookings/ensure-invited` added (dev-only,
  `NonProductionGuard`, same pattern as the existing `/dev/tracked-links`).
  Discovered while fixing the screenshot suite: seed already pairs the demo
  creator (Emma Berg) with a non-declined booking against **every** campaign
  the demo brand (Ledgerly) has, so a real `POST /bookings` booking-Emma flow
  always 409s — there is no way, through the real UI, to ever give her a
  fresh INVITED row. The endpoint no-ops if the creator already has an
  INVITED booking anywhere, else finds a campaign they have zero
  relationship with yet and creates one there (deliberately not reusing
  `create()`'s "signed-in company's active campaign" resolution, so it never
  lands a second booking in a campaign the creator's already in).
  `shots.mjs` calls it before shooting `creator-booking-requests.png`, so
  that shot always has an INVITED row with Accept/Decline visible, and reran
  it stays idempotent (later runs find the existing INVITED booking and
  no-op). Also fixed while in these files: `CreatorHomePage`'s booking
  section heading changed from "Booking requests" (inaccurate — it lists
  every status, including Paid/Live/Declined) to "Your bookings".
- 2026-09-10 — Booking loop built end to end (slice 2.13, both sides — an
  explicit ask that widened the original rail-only scope). Four routes in
  `bookings/` (was an empty stub): `POST /bookings` (COMPANY), `GET
  /bookings/received` (CREATOR, own profile), `GET /bookings/sent` (COMPANY,
  own company, optional `?campaignId`), `PATCH /bookings/:id/status`
  (CREATOR, INVITED→ACCEPTED|DECLINED). All behind `JwtAuthGuard` +
  `RolesGuard` + `@Roles` — the first feature endpoints to be; every prior
  route (creators/campaigns/shortlist) is still unauthenticated. Ownership is
  enforced by resolving the caller's own `companyId`/`creatorProfileId` from
  the JWT subject via a Prisma lookup (same pattern as `auth.service.me()`)
  rather than trusting any id the client sends; `received` and the status
  update never accept a creatorProfileId from the client at all, so there is
  no ownership check to get wrong. `agreedPriceCents` is derived server-side
  from the creator's own `postCostCents`/`bundle5PriceCents` by which package
  the client selected — the client never sends a cents figure, so the price
  can't be tampered with in transit. Added `CampaignsService
  .getActiveForCompany(companyId)` alongside the existing `getActive()`,
  which is global (most recent LIVE across *all* companies) and was about to
  be reused incorrectly for "the signed-in company's active campaign" — it
  stays as-is for the marketplace/shortlist, which still have no campaign
  switcher. The schema has no unique constraint stopping two bookings for the
  same creator+campaign, so `create()` 409s on a second non-DECLINED booking
  rather than silently duplicating. Hand-verified end to end against the
  running API before committing: logged in as Ledgerly, booked a creator,
  logged in as that creator, listed/accepted the booking, and confirmed the
  role/ownership/re-accept guards all reject correctly (403/403/404/409/401).
  Committed in two parts: API + shared types + web api layer first (once
  verified working), UI second.
- 2026-09-10 — Booking rail, card, and creator side. `BookingRail` gained a
  deliverable `Input` (defaults keyed off the selected package, editable), a
  real submit, and three post-submit states: booked (StatusPill + agreed
  price + deliverable, replacing the form rather than resetting it),
  conflict (plain "already booked" message, no form, no dead retry button —
  a 409 will never succeed on retry so one isn't offered), and a generic
  error (in-voice message + "Try again", which does make sense to retry).
  `http.ts`'s `request()` now throws a small `ApiError` carrying the HTTP
  status so the rail can tell these apart. Also softened the rail's "How
  booking works" step 3, which claimed the post goes live and payment
  releases on accept — neither is real yet (TrackedLink is 4.3, payout is
  4.4) — to "you and the creator coordinate the post and payment directly."
  New `bookingsStore` (mirrors `shortlistStore`'s hydrate pattern) maps
  creator → booking status for the active campaign so `CreatorCard` can show
  a status pill next to the sector-fit badge — chosen over building the
  Collaborations table (4.2) now, since that is a materially bigger slice
  (table, status tabs, campaign filter) and the badge is the cheaper way to
  satisfy "the brand can see a booking after making one" without a new
  screen. The Book button's existing behavior (open the profile modal, rail
  always visible alongside it) needed no changes — it was already the single
  path in and stays that way. `CreatorHomePage` gained a "Booking requests"
  section (all of the creator's bookings, Accept/Decline shown only on
  INVITED rows, empty state in-voice) — the creator-side half of the loop.
- 2026-09-11 — `GET /auth/demo-creator` added: public, unauthenticated,
  demo-only affordance. Verified by hand against the deployed site (not
  assumed): booking a creator as Ledgerly, then clicking "Continue as a
  creator," landed on Emma Berg — who is not who was just booked. Cause: the
  seed gives Emma a non-declined booking against every Ledgerly campaign, so
  `POST /bookings` always 409s for her, and `EntryPage.tsx` hardcoded her
  email (`emma.berg0@creators.naano.dev`) as the creator side of "Continue as
  a creator" regardless of who the brand actually booked. Result: the
  two-sided loop — the single most important thing a reviewer will try —
  could not be completed by anyone on the live site, ever. Fixed by resolving
  the creator dynamically: `AuthService.demoCreatorEmail()` returns the email
  of whoever the demo brand (Ledgerly, matched by
  `growth@ledgerly.example.com`) most recently booked (`Booking.createdAt`
  desc, any status), falling back to the first creator the seed created
  (`CreatorProfile.createdAt` asc) when Ledgerly has no bookings at all.
  `EntryPage.tsx` calls it before signing in, instead of a hardcoded email.
  Public and unauthenticated — deliberately not behind `NonProductionGuard`
  like the `/dev/*` routes, because it has to keep working on the deployed
  site for a reviewer days from now, and it returns nothing but a seeded
  account's email, nothing sensitive. Verified end to end on the local stack
  via the real UI: booked Ines Jensen (a creator with no prior Ledgerly
  booking) as the brand, signed out, clicked "Continue as a creator," landed
  on Ines Jensen with an Invited row for Fintech Trust Campaign, and Accept
  worked (row moved to Accepted). Re-running the same check against an
  already-booked creator correctly still resolves to them (most recent, not
  first match), confirming this works repeatedly, not just once.
- 2026-09-11 — Seeded campaign `destinationUrl`s changed from
  `ledgerly.example.com`/`vertice-analytics.example.com` subdomains (neither
  resolves — confirmed by hand, both DNS-fail) to `example.com` itself
  (confirmed resolving: 200 on `/`, and a real "Example Domain" page, not a
  browser error, on any `/lp/...` sub-path even though it 404s). Clicking a
  tracked link previously hit a browser connection error instead of a landing
  page — tracking still fired (the `ClickEvent` is written before the 302),
  but it read as broken. Tracking code (`tracking.service.ts`,
  `bookings.service.ts`'s accept-time mint) is unchanged, per the ask.
  **This alone does not fix already-seeded data.** `seed.ts` only runs once,
  by hand, against an empty database (Session B) — it is not rerun on
  deploy, so a production database that was already seeded keeps the old
  broken `Campaign.destinationUrl` values regardless of this code change.
  Worse, `TrackedLink.destinationUrl` is copied from the campaign once at
  accept time (`bookings.service.ts`) and never read live afterward, so even
  a from-scratch reseed of `Campaign` wouldn't retroactively fix
  `TrackedLink` rows that already exist — and reseeding isn't an option
  anyway: `seed.ts` has no cleanup step (no `deleteMany`), so rerunning it
  against a database that already has this data 500s on the first duplicate
  email; the only remote-safe path per CLAUDE.md is forward-only, no reset.
  Added `apps/api/prisma/fix-destination-urls.ts`: a one-off, idempotent
  `updateMany` per exact old→new URL pair, run once against both `Campaign`
  and `TrackedLink`. Verified locally: fixed 4 campaigns + 107 existing
  tracked links, a second run matched 0 rows, and `GET /r/<slug>` for a
  previously-broken link now 302s to a URL that actually resolves. **A
  production reseed is not needed and would not be safe or sufficient
  anyway** — what production needs instead is this one-off script, run once
  by hand the same way `prisma:seed`/`prisma:migrate` are (`railway run`,
  which injects `DATABASE_URL` into the subprocess without it ever being
  typed or committed): from `apps/api`, `railway run npx ts-node
  prisma/fix-destination-urls.ts`. Not run against production from here —
  the user runs it.
- 2026-09-11 — Verified click tracking end to end locally, to resolve
  something that couldn't be told apart from outside the app: on the live
  site, hitting `/r/728a982c` left the brand card reading "30 clicks"
  unchanged — was the click not recorded, or was the card showing one of the
  creator's other three bookings? **Recording itself is correct.** Booked
  Erik Marchetti fresh, accepted as him (`trackedLinkSlug` minted,
  `clickCount: 0` on both `GET /bookings/sent` and `/bookings/received`), hit
  `/r/<slug>` three times (each a real 302 to the now-resolving destination),
  re-fetched both endpoints: `clickCount: 3` on both, and a reloaded
  marketplace card render (Playwright) shows "3 clicks" too — 0 to 3
  everywhere, exactly once per click. **The card does not aggregate across a
  creator's bookings** — `bookingsStore` keys `byCreatorId` by creator and
  holds exactly one `{status, clickCount}`, the booking for whichever
  campaign the marketplace is currently ranked against (the active one), full
  stop. Any of the creator's other bookings (a different campaign, a
  different company) are invisible to this card — not summed, not shown at
  all.
  **Found the actual bug while checking that, unprompted (in scope for this
  verification, not fixed — reported here for the next session):**
  `bookingsStore.hydrate()` (`apps/web/src/lib/stores/bookingsStore.ts`)
  builds `byCreatorId` with `for (const booking of page.items) byCreatorId
  [booking.creatorProfileId] = {...}`, and `page.items` is `GET
  /bookings/sent` ordered `createdAt: "desc"` (newest first). When a creator
  has more than one booking against the *same* active campaign — normal once
  one has been declined and a fresh one made for them, since `create()` only
  blocks a second *non-declined* booking — the loop's last write wins, and
  because the array is newest-first, the **last** write is the **oldest**
  row. The card ends up showing a stale booking instead of the current one.
  Reproduced live with real seed data: Adam Bauer has a DECLINED booking
  against Fintech Trust Campaign and a newer INVITED one against the same
  campaign; his marketplace card renders "Declined" — the stale row — even
  though he has a live pending invite. This is almost certainly what was seen
  on the live site: Emma has four bookings, so if two of them collide in the
  same campaign the way Adam's do, her card can be pinned to a stale one
  indefinitely regardless of which of her links gets clicked. Not fixed here
  — flagged in `docs/PLAN.md`'s Discovered section for a session that can
  size the fix (sorting ascending before the loop, so the newest write wins,
  is the likely one-line fix, but wasn't verified against the rest of the
  store's contract).
- 2026-09-11 — Fixed the `bookingsStore.hydrate()` stale-card bug above. When
  a creator has more than one booking against the active campaign, the card
  now shows the **most recent** one, not whichever sorts last in the loop.
  Chose most-recent over any other tie-break (e.g. "prefer non-declined," or
  "prefer the highest-progress status") because the card exists to answer
  one question for the brand — "what did I just do with this creator" — and
  the most recent booking is definitionally the state the brand most
  recently created and the one they're looking at the marketplace to check
  on. A creator who declined an old invite and has since been rebooked
  should read as freshly invited, not as their old decline, regardless of
  which one has "more" status progress. Implementation:
  `listBookingsSent` already orders `createdAt: desc`, so `hydrate()`'s
  build loop now skips a `creatorProfileId` it has already seen instead of
  overwriting — first-seen-wins on an already-newest-first array is
  most-recent-wins, with no new sort and no change to the API. Verified on
  the local stack with the three cases asked for: Adam Bauer's card now
  reads "Invited" (was "Declined") while his live pending invite still
  exists; Erik Marchetti, who has exactly one booking, renders identically
  to before (Accepted, 3 clicks); and freshly booking Ruby Holm (declined
  out of her prior Fintech Trust history for the test) through the real UI
  shows "Invited" immediately, with no reload — confirming `recordBooking`'s
  separate optimistic-update path was never affected by this bug and still
  isn't.
- 2026-09-11 — Slice 4.2, Collaborations + an honest left rail, built and
  committed in two passes to avoid colliding with session B (mid-merge, and
  already burned time on one DECISIONS.md conflict). Steps 1–3 — backend
  (`GET /bookings/sent` gains `?status=`, returns `BookingSent`),
  `packages/shared/src/api.ts`'s new type, `CollaborationsPage` +
  `CollaborationsTable`, and the honest `AppShell`/`App.tsx` — are this
  commit. Step 4 — widening `ApiClient.listBookingsSent` in `client.ts` and
  `http.ts`, plus the matching additive change to `fixtures.ts` — is
  deliberately held until session B has pushed, since `fixtures.ts` was on
  their protected file list; steps 1–3 touch none of their five protected
  files (confirmed via `git status` before this commit). Verified against
  the running local API ahead of that step anyway: Vite doesn't type-check
  in dev, and the real HTTP response already carries the new fields, so
  `CollaborationsPage` already renders correctly end to end (creator name,
  campaign, both packages, price, status, tracked link + clicks) even before
  `client.ts` catches up — only the `?status=` filter param is inert until
  then, since `http.ts` doesn't forward it yet. `tsc -b` on the web app
  currently fails with exactly two errors, both in `CollaborationsPage.tsx`,
  both closed by step 4 — that's expected, not a regression to chase.
  - **Package is derived, not stored.** `Booking` has no package column, and
    `deliverable` is free text the brand can edit after booking (the input
    in `BookingRail.tsx` starts from a default but is user-editable), so it
    is untrusted and never the source of truth for which package was
    booked. `agreedPriceCents` is set server-side at creation to exactly the
    creator's own `postCostCents` or `bundle5PriceCents`
    (`BookingsService.create`) and never changes afterward, so
    `toBookingSent` (`mappers.ts`) recovers `package` by comparing
    `agreedPriceCents === creatorProfile.bundle5PriceCents` — same
    derive-don't-store pattern already used for CPM, no new column.
    Verified against real data: 76 single-post and 2 bundle-of-5 bookings in
    the local DB all derived correctly.
  - **`?status=` is a real server-side filter**, not a client-side slice —
    `ListBookingsSentDto` gained `status?: BookingStatus`
    (`@IsIn`-validated, same pattern as `vertical` on `ListCreatorsDto`), so
    it stays correct past one page. A plain dropdown, not RECON §7's status
    tabs with counts — counts need extra queries per status, which isn't
    "nearly free," and a correct table beats a filtered one at this hour.
  - **The creator rail is gone, not shrunk to one icon.** The original ask
    was "make the rail honest, no icon without a real destination" — a
    creator has exactly one real screen (their own profile, already at
    `/app`), and a rail holding a single permanently-active icon is the same
    complaint about the four dead icons this slice started from, one layer
    down: navigation with one destination is decoration wearing the same
    clothes as a real nav. Dropping it cost one conditional
    (`AppShell.tsx`'s `isBrand &&` gate on the `<nav>` and on `<main>`'s left
    margin) — cheap enough that "keep the single icon because dropping it
    isn't worth it tonight" didn't apply. A signed-in creator now gets the
    top bar (identity, Sign out) and full-width content, nothing else.
  - **Collaborations is brand-only at the router, not just hidden from the
    rail.** `App.tsx`'s new `RequireBrand` wrapper redirects a creator who
    reaches `/app/collaborations` directly back to `/app` — the rail simply
    never showing them the icon isn't a real guard, a typed URL still is.

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
- 2026-09-11 — Slice 4.2 closed (step 4, after pulling session B's merge —
  see the PLAN.md 2026-09-11 Discovered entry for the exact change list and
  verification). One thing worth recording here: `git pull origin main` was
  a no-op by the time this ran — B's merge commits (`8bf4eea`, `a0cf18d`)
  were already present locally, most likely from an earlier `pull`/`merge`
  in this same working copy rather than anything run in this step. Confirmed
  via `git log` before touching anything, so step 4 built against the
  actual merged `fixtures.ts` (session B's filter-matching logic plus the
  booking/demo-creator fixtures from earlier this session), not a stale
  in-context copy. `client.ts`/`http.ts`/`fixtures.ts` are the only files
  this pass touched, all three purely additive to what steps 1–3 already
  established — no design decision to record beyond what's already in the
  entries above.
- 2026-09-11 (Session B) — 2.12 (modal Content tab) folded into Overview
  instead of shipped as a third tab. RECON's Content tab, checked line by
  line against the already-built `OverviewTab.tsx`:

  | RECON left-column item | Verdict |
  |---|---|
  | Topic chips (AI, Marketing, SaaS) | No backing field anywhere in the schema — would be fabricated, not derived from real data. Dropped. |
  | Reach sparkline | Literal duplicate of Overview's — same component, same data. Dropped. |
  | Latest post date | Same value as post #1's date, already on Overview's post card. Dropped. |
  | Posts analysed | Always visible in `BookingRail` regardless of which tab is open. Dropped. |
  | Posts 2–5 (the carousel) | The only genuinely new thing — Overview only ever showed post #1. Kept, folded in. |

  Four of RECON's five content-tab items were either redundant with what's
  already on screen one tab-click away (or, for `BookingRail`, visible at
  the same time regardless of tab) or had no real data to back it — shipping
  them as a third tab would have padded the modal with a weaker duplicate,
  not added a stronger one. Only the carousel (browsing posts 2–5, previously
  unreachable) was real. So `OverviewTab.tsx`'s existing post card gained a
  pager instead of a new tab: `postIndex` state, "N of 5" + prev/next
  (disabled at both ends; no pager rendered for a single-post creator), and
  a `useEffect` keyed on `creator.id` that resets to post 1 and collapses
  the text expander whenever the modal opens a different creator (and the
  page-change handler does the same on every prev/next). The "Content
  performance" section header gained a caption — `"5 posts, 9 Aug – 9
  Sept"` — giving the post set's own date span.
  **Deliberately not measured against today.** `apps/api/prisma/seed.ts`
  generates each `CreatorPost.publishedAt` within ~35 days *of seed time*
  (`postDays = shuffled([2, 6, 11, 18, 27, 33])`), not of whenever a
  reviewer opens the demo. A "posts in the last 30 days" figure would read
  correctly on seed day and silently go to 0 afterward with no reseed to
  fix it — the same trap `postedWithinDays` avoids server-side by being a
  filter, not a displayed count. The date-range caption sidesteps this
  entirely by comparing the posts only to each other.
  No `ContentTab.tsx`, `PostCarousel.tsx`, or third `Tabs` item exists;
  `CreatorProfileModal.tsx` is untouched. Verified live against the running
  API: pager advances/retreats, disables correctly at both ends, collapses
  an open "See full post" on every page change, and a freshly opened
  creator always lands on post 1. Typechecked `packages/shared`, `apps/web`,
  `apps/api` clean.

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
