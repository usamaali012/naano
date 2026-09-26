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

- 2026-09-11 — Slice 5.4 (attribution by creator). `GET /analytics/attribution`
  (brand-only) aggregates in memory over the signed-in company's bookings,
  the same small-catalogue justification `creators/` already uses — the
  result set is bounded by how many distinct creators one brand has ever
  accepted a booking with. Four decisions worth recording:
  - **Second number: dropped `qualifiedClicks`, used `lastClickAt` instead.**
    Checked every writer of `ClickEvent.isLead` before building anything:
    the only one is `seed.ts`'s `Math.random() < 0.06` — the real `/r/:slug`
    handler (`tracking.service.ts`) never sets it, so it is always `false`
    in production. A "qualified clicks" column would have looked like a real
    signal while actually being a coin flip baked into the seed. `lastClickAt`
    (max `ClickEvent.createdAt` per creator, across their tracked links) is a
    real, honest second number instead — shown as relative time
    (`formatRelativeTime`, new in `format.ts`) via `Intl.RelativeTimeFormat`.
  - **`acceptedBookingsCount` counts only bookings with a `TrackedLink`,
    and creators with none are excluded entirely.** Invited/declined
    bookings already live in Collaborations and have no link to click, so
    counting them here would double a number that means something different
    in each table. This merged what would have been two separate queries
    (all bookings, then bookings-with-links) into one `findMany` filtered on
    `trackedLink: { isNot: null }`, which now backs both the bookings count
    and the click join.
  - **Dropped the "More metrics & attribution details" expander** from
    RECON §8. Everything it would have shown (bookings, a second click-
    derived metric) is already a plain column in a four-column table —
    an expander over nothing but restated numbers is scaffolding, not a
    feature.
  - **In-memory aggregation, not a DB `groupBy` chain.** `booking.findMany`
    (accepted-only, with creator + trackedLink id) joins to two
    `clickEvent.groupBy` calls (by `trackedLinkId`: `_count` and
    `_max(createdAt)`) scoped to those link ids, then link-level results
    fold up to creator level in application code, sorted `totalClicks` desc
    then `creatorDisplayName` asc (stable ties across pages), then paginated
    by array slice. Two honest empty states result from this, computed over
    the *full* result set so a later page can't be mistaken for either: zero
    accepted bookings → "Clicks are tracked once a creator accepts a
    booking." with a link to Collaborations; bookings exist but
    `hasAnyClicks` is false → a distinct "no clicks yet" finished state,
    instead of a table of all-zero rows that would read as broken. Verified
    against the running local API before building the UI: `GET
    /analytics/attribution` as the brand → 200 with real rows (40 creators,
    sorted correctly, ties like Lena Eriksson/Victor Neumann at 68 clicks
    breaking alphabetically); as a creator → 403; with no token → 401; an
    unknown query param (`campaignId`) → 400 (confirms no campaign filter
    exists, by design). `fixtures.ts` got one additive `listAttribution` —
    done last, after confirming with the user it was clear of session B's
    work — deriving the same shape from in-memory `fixtureBookings`;
    `lastClickAt` is always `null` there since fixtures never simulate a
    real `/r/:slug` click.

## Session: web (own-product redesign)

The brief changed: 8x stopped wanting a naano clone and started scoring our
own interface and product decisions. This session owns `apps/web/**`
end to end (including `lib/api/*`); session A owns all of `apps/api`. Working
against the "Creator side" contract in `packages/shared/src/api.ts` (agreed,
not edited here) and `docs/RECON-CREATOR.md`.

- 2026-09-25 — Token layer: ground moved from naano's cool grey (`#F7F8FA`) to
  a warm off-white (`#FAF6EF`), ink to a warm near-black (`#1C1712`), and
  `--primary` from naano's own `#2563EB` to an oxblood `#7C2D3B` — a
  distinctive, non-generic accent that still reads as confident B2B, and
  distinct from `--success` (green) and `--warn` (amber) so status pills stay
  legible against it. Type moved from Inter to IBM Plex Sans, loaded via a
  real Google Fonts `<link>` in `index.html` (Inter was never actually
  fetched anywhere before this — the old `--font-sans` just named it and fell
  through to the system-ui fallback, so this is the first session where the
  declared typeface and the rendered one are the same font). Both the
  favicon and `theme-color` in `index.html` are hardcoded hex by necessity
  (a data-URI SVG can't reference a CSS custom property) — updated to match
  the new primary per `ui/Logo.tsx`'s existing "change both together" note.
  Scope was `index.css` + `index.html` only, no component touched: every
  primitive in `components/ui/` was already 100% token-driven (verified by
  reading all fourteen before editing), so the new palette and typeface
  cascade through every existing screen with zero component edits. Also
  fixed `apps/web/.env`'s `VITE_API_URL` — it pointed at `:3001`, the running
  local API is on `:3000` (confirmed via `curl .../health`) — a stale local
  value unrelated to this slice, not a structural change. `docs/DESIGN.md`'s
  token/type tables updated in place to match (they are the literal visual
  spec, not history, so they carry the new values; the running rationale
  lives here). Verified live: entry page and the marketplace grid both
  render on the new palette/font with no regressions, `--success`/`--warn`
  still read as distinct status colours next to the new primary.
- 2026-09-25 — Two corrections to the token pass above, both requested after
  review: (1) IBM Plex Sans everywhere read as "the default of developer
  tooling," not a decision — added a second family, Fraunces (serif), for
  headings only. New `--font-serif` token; base rule in `index.css` targets
  the `.text-page-title`/`.text-section-title` Tailwind fontSize utilities
  directly (not every `<h1>`/`<h2>` element), so `h1`/`h2`/page titles go
  serif and `h3`/card-title-level headings — which repeat many times per
  screen (a creator name, "Audience composition," a rail label) — stay on
  the sans, per the ask to keep body and controls neutral. (2) The
  primitives were re-coloured, not finished — `components/ui/` still read
  as recoloured Tailwind defaults. Real per-component passes, still 100%
  token-driven (no new hardcoded value anywhere):
  - **Button.** Two new derived tokens, `--primary-hover`/`--primary-active`
    (`color-mix` off `--primary`, defined once in `index.css`, exposed as
    `bg-primary-hover`/`active` in `tailwind.config.js`) replace the generic
    `hover:opacity-90`. Secondary/ghost variants gained a real hover
    treatment too (border+text shift on secondary, a `primary-soft` fill on
    ghost) instead of a single muted-to-text color change.
  - **Input/Select.** Dropped the stock `focus:ring-1 focus:ring-primary`
    (a `border-primary` and a same-color ring stacked is the single most
    recognizable default-Tailwind focus tell) for a soft halo —
    `focus:shadow-[0_0_0_3px_var(--primary-soft)]` — and bumped padding from
    the 8/12px pairing to 12/16px for a less cramped field.
  - **Table.** `THead` gained `bg-bg` — the header band now reads as a
    distinct zone from the white body without adding a second border weight
    (still one hairline, per DESIGN.md).
  - **Tabs.** Rebuilt from an underline strip to the same "active =
    `primary-soft` fill" chip language the icon rail already uses
    (DESIGN.md §layout) — two nav idioms in the app now read as one system
    instead of two unrelated defaults (underline tabs + filled rail).
  - **StatusPill/Badge.** Wider horizontal padding, `font-medium` on Badge,
    a smaller status dot (1.5 vs 2 units) so the label carries more of the
    weight than the dot.
  - **Card.** Default padding `p-s4` → `p-s6`. Its only current consumer
    (`CreatorCard`) already overrides to `!p-0`, so this is free to change
    now, ahead of piece 2's detail panel becoming the real consumer.
  Verified live: entry page (serif h1 + serif hero line, sans body),
  marketplace (chip tabs, haloed filter selects), Collaborations (tinted
  table header, status pills).
- 2026-09-25 — Piece 2, the marketplace redesign: the card grid and the
  profile modal are both gone, replaced by a comparison list (an actual
  `Table`, not cards — DESIGN.md's layout rule updated to match) beside a
  persistent detail panel. Selecting a row, or the row's own Book button,
  fills the panel in place; paging, searching, filtering or switching tabs
  never closes anything, because there was never anything modal to close.
  This is the product decision the brief is now scored on: a brand's job on
  this screen is comparing creators, and a grid you open one card of at a
  time makes you hold the rest in your head instead.
  - **New files.** `components/marketplace/CreatorComparisonList.tsx`
    (replaces `CreatorGrid`/`CreatorCard`) — one row per creator, columns
    fixed to exactly the comparison fields asked for: name (+ vertical,
    country as a second line, to save a column), followers, median views,
    CPM, post cost, sector fit, status, plus the shortlist star and Book as
    trailing action cells. `components/marketplace/CreatorDetailPanel.tsx`
    (replaces `CreatorProfileModal`) — same header/Tabs/OverviewTab/
    AudienceTab/BookingRail as the old modal, relocated, not rewritten; the
    one real layout change is the booking rail moving from a side column to
    a stacked section below the tab content, because the old modal was
    1080px wide with room for two columns and this panel is ~440px and
    isn't. Both are new files, `CreatorGrid.tsx`/`CreatorCard.tsx`/
    `CreatorProfileModal.tsx` deleted outright (dead code once the page no
    longer imports them, not left in place).
  - **Selection model.** `CreatorsListPage` keeps its existing
    `selectedIds` (checkbox multi-select, for the "add N to shortlist" bulk
    bar — unchanged) alongside a new single `selectedCreatorId` for the
    panel. What the panel actually shows is a derived `activeCreatorId`:
    the explicit selection if it's still in the current `displayed` list,
    else the top row — so the panel is never empty once the list has
    results (first load, a fresh filter, a new page, or the shortlist tab
    losing its previously-open creator once un-starred) without a
    `useEffect` fighting the derived list for control.
  - **Layout.** `flex-col lg:flex-row` — list `flex-1 min-w-0` (so its own
    `Table` wrapper's `overflow-x-auto` is what scopes horizontal scroll on
    narrow viewports, not the page), panel `lg:w-[440px] lg:sticky lg:top-8`
    so it stays alongside the list while it scrolls, consistent with
    DESIGN.md's 1440px/32px content frame. Below `lg` it stacks, panel
    under list, unstickied — the same breakpoint pattern the old modal's
    `flex-col lg:flex-row` main/rail split already used.
  - **Nothing behavioural changed underneath.** Same `bookingById`/
    `shortlistSet` maps, same `api.getCreator`/`api.createBooking` calls,
    same `bookingStatus.ts` tones, same 409-conflict handling in
    `BookingRail` — confirmed live: the shortlist tab still filters
    correctly and keeps the row selected if it survives the filter, the
    "already booked" conflict notice still renders for a creator with a
    live booking, pagination (`Showing 1–12 of 40`, `Page 1 of 4`) is
    untouched, and clicking down the list swaps the panel with no
    open/close step or console error at any point.
  - **`Card`'s p-s6 bump from the primitives-correction entry above** is
    now actually exercised — `CreatorDetailPanel` is its real first
    consumer, not just cleared for one.
  - **Not done, deliberately out of scope for this piece:** `scripts/
    shots.mjs`'s `creators-grid`/`modal-*` shots reference the deleted
    grid/modal (`page.getByRole("button", { name: "Book" })` →
    `waitForSelector('[role="dialog"]')`, which no longer exists) and will
    fail as written — flagged here rather than fixed, since the ask was
    piece 2 and nothing else. Whoever runs the next full `npm run shots`
    regen needs to rewrite that block against the list + panel first.
- 2026-09-25 — Piece 3: the creator's Collaborations section, rebuilt around
  `nextAction` instead of status alone. Read-only against session A's already
  -built and verified contract: `GET /bookings/received` now returns
  `CreatorCollaboration` (`BookingReceived` + `nextAction: {kind, label,
  consequence}` + `netCents`) — nothing in `apps/api` touched.
  - **The consequence string decides the row's visual register, not the
    booking status.** `nextAction.consequence` is non-empty exactly for
    `respond` (INVITED) and `publish` (ACCEPTED) — the two states where the
    creator's own inaction has a stated cost — and empty for `await_brand`
    and `none`. `CollaborationCard` branches on that presence: a non-empty
    consequence gets a `primary-soft`-tinted panel with the label in
    `font-medium text-primary`, the consequence itself, and (for `respond`
    only) the real Accept/Decline buttons; an empty one gets a single plain
    `text-muted` line and nothing else. First pass gave both states the same
    padded box in a different colour — visually still one thing with two
    paint jobs, not two different kinds of row — so the box was dropped
    entirely for the informational case rather than just recoloured again.
  - **`netCents`, not `agreedPriceCents`, is what renders** ("your net," top
    -right of each card, `tabular-nums`) — the creator's side of the same
    commission split the brand's Collaborations table never shows.
  - **Sorted actionable-first client-side**, not server-side: `orderByNextAction`
    stable-sorts the already-fetched page by `consequence !== "" ? 0 : 1`,
    preserving the API's own `createdAt desc` within each group. Only safe
    because this screen has never paginated its `pageSize: 20` fetch (no
    `CreatorsPagination` here, unlike the brand's list) — sorting only within
    a visible page would misrepresent "actionable first" the moment a real
    pager existed, so this doesn't generalise past this screen as-is.
  - **`updateBookingStatus`'s response is no longer patched into the row
    directly.** It returns a bare `Booking`, which has no `nextAction`/
    `netCents` — patching it in would have frozen the row's next-action
    label at "Accept or decline" even after a real Accept flipped the status
    to ACCEPTED (kind should become `publish`). `respond()` now re-fetches
    `listBookingsReceived` on success instead — same endpoint already in use,
    no new one, and the only way to get a server-recomputed `nextAction`
    without duplicating `next-action.ts`'s logic on the web side.
  - **New files**, mirroring the brand-side `components/campaign/` pattern:
    `components/creator/CollaborationCard.tsx`, `components/creator/
    TrackedLinkRow.tsx` (moved out of `CreatorHomePage.tsx` verbatim, now
    reusable). `CreatorHomePage.tsx`'s section renamed "Your bookings" →
    "Collaborations"; the profile card below it is untouched.
  - **`ApiClient.listBookingsReceived` widened** from `Paginated<
    BookingReceived>` to `Paginated<CreatorCollaboration>` in `client.ts`/
    `http.ts` (the real endpoint already returns this shape) and `fixtures.ts`
    (type-only change — it already returned an empty array, since `FIXTURE_ME`
    is always the brand and there's no creator-mode fixture context yet, per
    the existing comment there).
  - **Not touched:** Earnings (piece 4), any nav/routing change (a creator
    still lands on one route, `/app`, no rail) — RECON-CREATOR.md's ten-item
    nav is not being reproduced; adding creator navigation was not asked for
    here and would be a separate, deliberate decision once Earnings exists
    too.
  - Verified live (Adam Bauer, the seeded creator with a mixed INVITED/
    DECLINED/PAID/LIVE history): the one actionable row (INVITED) sorts
    first with the tinted panel and both buttons; the other three render as
    plain "Nothing to do." lines; `netCents` values are correct per row
    (€413/€1,204/€356/€340); tracked link + copy renders on the two rows
    that have one (PAID, LIVE) regardless of their next action.
- 2026-09-26 — Piece 4, the creator's Earnings screen, plus the navigation
  decision it forced. Read-only against session A's already-built and
  verified `GET /bookings/earnings` — nothing in `apps/api` touched.
  - **Navigation decision, made before writing any screen code.** The
    no-rail call for creators (piece 3's entry above, and the original
    2026-09-11 "Collaborations + honest rail" entry it references) was
    reasoned specifically as: a rail holding one permanently-active icon is
    decoration wearing navigation's clothes, because a creator had exactly
    one real screen. Earnings makes three (profile, Collaborations,
    Earnings). That specific reasoning stops applying the moment a second
    real destination exists, let alone a third — so the rail comes back for
    creators, real destination for real destination, same shape as the
    brand's own three-item rail, rather than stacking Earnings as a third
    section onto an already-two-section profile page that would only keep
    growing from here. `AppShell.tsx`'s `RAIL` constant split into
    `BRAND_RAIL`/`CREATOR_RAIL`; `showRail` replaces the old `isBrand` gate
    on both the `<nav>` and `<main>`'s left margin, so a creator gets the
    same 72px rail treatment a brand always has.
  - **Collaborations now has two components behind one URL.** `/app/
    collaborations` used to be brand-only (`RequireBrand`-gated); it's now
    role-branched like `AppIndex` already was (`App.tsx`'s new
    `CollaborationsIndex`) — a brand still gets `CollaborationsPage`
    (every booking they've made), a creator now gets a real
    `CreatorCollaborationsPage` (extracted verbatim from `CreatorHomePage`'s
    old embedded section, not rewritten) instead of being redirected back
    to `/app`. `/app/earnings` is the mirror of `/app/results`: a new
    `RequireCreator` guard (brand hitting the URL directly lands back on
    `/app`, not an error), same shape as the existing `RequireBrand`.
    `CreatorHomePage.tsx` is profile-only now — Collaborations moving to
    its own route is what let it drop back to exactly what it was before
    piece 3 folded a section into it.
  - **Every figure is already net** — `CreatorEarnings.totalEarnedCents` /
    `averageCents` / `inTransitCents` come pre-computed from the API
    (`COMMISSION_PCT` applied server-side, `apps/api/src/bookings/
    money.ts`); the web side only formats and renders, no second commission
    calculation to keep in sync with the one in `next-action`/`money.ts`.
  - **`EarningsChart.tsx`** is a token-only inline SVG bar chart, same
    restraint as `ReachSparkline` (no axes, no grid, no charting
    dependency): six bars, the newest solid `--primary`, the rest a lighter
    `color-mix` tint of it — "here's now, here's the run-up to it," not six
    equal bars. Month labels are the only text on the chart.
  - **No withdraw control, no "available to withdraw" balance** — per the
    explicit ask and this project's own standing rule (a control that
    renders but does nothing is worse than no control): payment rails are
    cut, so there is nothing a withdraw button could actually do.
  - **The empty state triggers on `paidCollaborationsCount === 0 &&
    inTransitCents === 0`**, not on `paidCollaborationsCount === 0` alone —
    a creator with money already in transit (accepted, not yet paid) has
    something real to show even with zero paid history, so that case still
    renders the normal tiles + chart (honestly reading `€0`/`0` where
    nothing has happened yet) rather than a message that would contradict
    the in-transit figure sitting right next to it. Only the fully-empty
    case (nothing paid, nothing in transit — a creator with no accepted
    bookings at all) gets the dedicated empty-state panel, linking to
    Collaborations, so it reads as a finished screen rather than a wall of
    zeros.
  - **New files:** `routes/CreatorEarningsPage.tsx`, `routes/
    CreatorCollaborationsPage.tsx` (the extraction), `components/creator/
    EarningsChart.tsx`. `ApiClient` gained `getEarnings(): Promise<
    CreatorEarnings>` (`client.ts`/`http.ts`/`fixtures.ts` — fixtures
    returns an honest all-zero stub, same "no creator-mode fixture context
    yet" limitation already noted for `listBookingsReceived`).
  - Verified live: a creator with mixed history (Adam Bauer — 1 PAID, 1
    LIVE, 1 DECLINED, 1 INVITED) renders real tiles and a six-bar chart with
    the current month solid; the rail shows Profile/Collaborations/Earnings
    for a creator and Marketplace/Collaborations/Results for a brand, each
    routing correctly; a brand hitting `/app/earnings` directly bounces to
    `/app`; typechecked clean across the whole change.

## Session — creator-side bookings/earnings API + search fix

Scope: `docs/RECON-CREATOR.md` + the "Creator side" contract block in
`packages/shared/src/api.ts` (pre-agreed with the web session, types
untouched). `apps/api/**` only — no `apps/web` file opened, no schema/seed
change.

- 2026-09-25 — `NextAction` derivation (`bookings/next-action.ts`, pure, no
  Prisma) and `netCents` (`bookings/money.ts`, one helper wrapping
  `COMMISSION_PCT` from `@naano/shared`) landed as separate small files rather
  than folded into `mappers.ts`, so `GET /bookings/earnings` can reuse
  `netCents` without importing mapper internals. `consequence` is empty for
  `await_brand` as well as `none` — it answers "what happens if the creator
  does nothing," and for `DRAFT_READY`/`SCHEDULED` the next move is the
  brand's, so the creator's inaction has no consequence to state.
- 2026-09-25 — `GET /bookings/received` now returns `CreatorCollaboration`
  (`toCreatorCollaboration` in `mappers.ts`, wraps `toBookingReceived` +
  `nextActionForStatus` + `netCents`) instead of bare `BookingReceived` — an
  in-place widen, not a new route, since `CreatorCollaboration extends
  BookingReceived` in the shared contract.
- 2026-09-25 — `GET /bookings/earnings` (new, creator-only, own profile via
  the existing JWT-subject lookup pattern). `inTransitCents` sums
  `ACCEPTED | DRAFT_READY | SCHEDULED | LIVE` — the literal "ACCEPTED through
  LIVE" state-progression span, DECLINED excluded despite sitting between
  ACCEPTED and DRAFT_READY in enum declaration order (it's terminal, not
  in-flight). Monthly buckets key off `payout.paidAt`, falling back to
  `booking.createdAt` only as a defensive default — `seed.ts` sets `paidAt`
  for every PAID booking, so the fallback isn't expected to fire against real
  data; `Booking` itself carries no better timestamp (no `updatedAt`). No
  query params, no pagination — verified against the running API as a
  creator with 3 PAID + 1 SCHEDULED booking: `netCents` on each row matches
  `agreedPriceCents` minus rounded 20%, `averageCents` rounds
  `totalEarnedCents / paidCollaborationsCount`, and all six monthly buckets
  render zero-filled except the current month (seed's `paidAt` is always
  within the last 6 days, so every PAID booking's earnings land in the
  current-month bucket — a property of the seed, not a bug in the grouping).
  403 for a COMPANY token, 401 with none.
- 2026-09-25 — `GET /creators?q=` now also matches `vertical`
  (`creators.service.ts`'s `verticalsMatching`): case-insensitive substring
  against the enum value with `_` read as a space, so `q=fintech` and
  `q=hr tech` both work without a separate label-mapping table (the web
  app's `VERTICAL_LABELS` map wasn't reused — it lives in `apps/web`, out of
  scope for this session, and the raw enum value alone is already readable).
  Verified against the live seed: `q=fintech` was 1
  result before this change (name/headline contains only), 5 after (of 40
  total) — the 4 newly-included rows are exactly the FINTECH-vertical
  creators whose name/headline never mention the word.

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

## Session: API, round 2

- 2026-09-26 — The brief changed again: "an interface I designed myself, on
  my own backend, real database, no mock data," five features today, split
  across an API session and a web session working in parallel. Wrote the
  shared contract first (`packages/shared/src/api.ts`) — widened `NextAction`,
  `CreatorCollaboration.draftContent`/`postUrl`, the new `BrandCollaboration`,
  `SubmitDraftBody`/`MarkPublishedBody`, `UpdateMyCardBody`,
  `CampaignOverview`, `CreateBookingBody.campaignId`, and `ActionCount` —
  before either session starts on its own routes/components, specifically so
  both sessions build against one agreed file instead of two people editing
  it at once.
- 2026-09-26 — A1, the booking lifecycle on both sides. `apps/api/**` only —
  `apps/web` and `packages/shared` untouched (the contract from the entry
  above was already correct for this slice, confirmed while building against
  it, nothing to flag). Five new endpoints, all under `bookings/`:
  - **`next-action.ts` rewritten**: `nextActionForStatus(status)` →
    `nextActionFor(status, viewer, hasDraft)`, still pure. `hasDraft`
    distinguishes a first ACCEPTED submission from a resubmit after
    request-changes (both are the same status, different copy) —
    `mappers.ts` passes `row.post !== null` for it, since a Post only exists
    once a draft has been submitted at least once.
  - **New `transitions.ts`**: a pure `action -> {role, from, to}` table for
    the five new actions (draft, approve, requestChanges, publish, markPaid
    — accept/decline predate this round and stay as literals in
    `updateStatus`, unchanged, per the ask). `wrongStateMessage(action,
    current)` builds the 409 sentence from it (`STATUS_LABEL` +
    `ACTION_VERB` tables) — one place instead of five inline template
    strings, and it's what makes `"This booking is live, so it can't be
    approved."` (the exact example asked for) fall out for free rather than
    being hand-written.
  - **Ownership is 404, never 403**, matching the existing `updateStatus`
    pattern: `bookingOwnedByCreator`/`bookingOwnedByCompany` (new private
    helpers) resolve the booking and check `creatorProfileId`/
    `campaign.companyId` against the JWT subject's own profile, 404 on any
    mismatch so a caller can't distinguish "not yours" from "doesn't exist."
    Wrong role is 403 via the existing `@Roles` guard, wrong state is 409
    via `assertTransition`.
  - **`submitDraft` upserts `Post.content`** — a resubmission after
    request-changes overwrites it, no version history, matching the ask.
    `publish` requires the Post row to already exist (it does, by the time a
    booking reaches SCHEDULED) and sets `linkedinUrl`/`publishedAt`; the URL
    itself is validated by `MarkPublishedDto`'s custom `IsPostUrlConstraint`
    (https + host in `{linkedin.com, www.linkedin.com, x.com, twitter.com}`,
    parsed via `new URL()` rather than a regex) before the service ever sees
    it. `markPaid` upserts `Payout` with `amountCents: agreedPriceCents` —
    checked against `seed.ts` before relying on it (`prisma.payout.create`
    there writes `amountCents: negotiated`, the full agreed price, never a
    net figure — commission is a render-time-only concept, per
    `money.ts`/`COMMISSION_PCT`'s own doc comment). Confirmed by reading, not
    assumed.
  - **`GET /bookings/sent` widened** from `Paginated<BookingSent>` to
    `Paginated<BrandCollaboration>` (`toBrandCollaboration`, new in
    `mappers.ts`, wraps `toBookingSent` + `nextActionFor(status, "COMPANY",
    hasDraft)` + `draftContent`/`postUrl`) — existing filters
    (`campaignId`, `status`) and pagination untouched, just the row shape
    grew, matching `listReceived`'s existing `BookingReceived` →
    `CreatorCollaboration` widen pattern from the creator-side session.
  - **New `prisma/demo-actions.ts`** (dry-run by default, `--apply`,
    refuses localhost without `--local`, same shape as `free-creators.ts`).
    Tops up, idempotently: the demo creator (`GET /auth/demo-creator`'s own
    resolution, re-implemented here since the script has no HTTP access)
    gets >= 1 booking in each of INVITED/ACCEPTED/SCHEDULED; the demo brand
    (Ledgerly) gets >= 1 booking, any creator, in each of DRAFT_READY/LIVE.
    Prefers creating a fresh booking in a campaign the target has no
    non-declined booking in yet (a declined-only campaign counts as free,
    same rule `POST /bookings` already enforces); falls back to converting
    an existing non-declined, non-PAID booking in place only when every
    campaign is already taken. `ensureChildRows` upserts exactly the child
    rows each status implies (TrackedLink from ACCEPTED on, Post from
    DRAFT_READY on, `linkedinUrl`/`publishedAt` from LIVE on, Payout at
    PAID) so a converted row reads as if a real reviewer had walked the
    whole loop by hand. Run locally with `--local --apply`: the demo creator
    (Adam Bauer) was missing ACCEPTED and SCHEDULED (had INVITED already, and
    the brand side already had DRAFT_READY/LIVE rows from the regular seed's
    random status assignment) — planned and applied 2 new bookings, 0
    conversions; a second `--apply` run immediately after reported "Nothing
    to do," confirming idempotency.
  - **Verified against the running local API (`localhost:3000`), real
    tokens from `POST /auth/login`, logged below.** Full happy path on one
    fresh booking (brand → Ruby Holm, created via `POST /bookings` since the
    demo creator's own campaigns were already full from the demo-data
    top-up above):
    ```
    PATCH  /bookings/:id/status   {status: ACCEPTED}      200  status: ACCEPTED, trackedLinkSlug minted
    POST   /bookings/:id/draft    {content: "..."}        201  status: DRAFT_READY, draftContent set, nextAction.kind=await_brand (creator view)
    POST   /bookings/:id/request-changes                  201  status: ACCEPTED, nextAction.label="Waiting for the creator's revised draft." (hasDraft=true)
    POST   /bookings/:id/draft    {content: "Revised..."} 201  status: DRAFT_READY, draftContent overwritten (old content gone)
    POST   /bookings/:id/approve                          201  status: SCHEDULED, nextAction.kind=await_creator (brand view)
    POST   /bookings/:id/publish  {postUrl: linkedin.com}  201  status: LIVE, postUrl set, publishedAt set
    POST   /bookings/:id/mark-paid                        201  status: PAID, nextAction.kind=none (both views)
    ```
    `GET /bookings/earnings` before/after `mark-paid` on a second booking
    (brand → Zoe Fontaine, walked to LIVE the same way): before —
    `totalEarnedCents: 26366, inTransitCents: 52126`; after —
    `totalEarnedCents: 52686, inTransitCents: 25806`. Delta on both sides is
    exactly `netCents(32900) = 26320` (32900 minus rounded 20%) — total up
    by it, in-transit down by it, to the cent. Error cases, all on a third
    booking (brand → Elin Halvorsen) walked to LIVE:
    `POST .../approve` as the brand → **409** `"This booking is live, so it
    can't be approved."`; the same call as the creator → **403**
    `"Forbidden resource"`; `POST .../draft` on Elin's booking authenticated
    as a different creator (Zoe) → **404** `"No booking \"...\""`;
    `POST .../publish` with `postUrl: "https://example.com/not-linkedin"` →
    **400** `["postUrl must be an https link on linkedin.com, x.com or
    twitter.com"]`. `GET /bookings/sent` and `/bookings/received` both
    confirmed to carry the new `nextAction` per row (spot-checked LIVE/PAID/
    ACCEPTED/DECLINED rows on the sent side, LIVE/PAID on the received side
    — labels and `kind`s matched the table above in every case).
  - `npx tsc -b --force` on `apps/api` (which also touches `packages/shared`
    types transitively) — clean, no errors.
- 2026-09-26 — A4, a creator edits their own card and price. `apps/api/**`
  only — `packages/shared` untouched (`UpdateMyCardBody` was already correct
  from the round-2 contract). New `PATCH /creators/me` (CREATOR-only):
  `dto/update-my-card.dto.ts` validates the per-field shape (headline trimmed
  1..160, both prices integer 5,000..2,250,000 cents); `CreatorsService.
  updateMyCard` adds what a per-field decorator can't express — "at least one
  field" and the bundle-vs-post cross-check, evaluated *after* merging the
  patch onto the stored row, so a body that only changes one of the two
  fields is still checked against the pair that will actually be persisted.
  Declared on the controller before `:id` (different HTTP verb so there's no
  real routing collision today, but the ask was explicit and it's one line).
  Never touches `Booking.agreedPriceCents` — that's fixed at booking time, a
  card edit only changes what *future* bookings will derive their price from.
  Verified against the running local API (`localhost:3000`), real tokens
  from `POST /auth/login`, demo creator Elin Halvorsen
  (`d2ea60bf9277c86522dca467`, originally `postCostCents: 77600,
  bundle5PriceCents: 260623`):
  ```
  PATCH /creators/me {postCostCents:85000,bundle5PriceCents:340000}  200  as creator — postCostCents/bundle5PriceCents updated
  GET   /creators?q=Elin Halvorsen                                    200  as brand — same row now reads postCostCents:85000 (CPM follows: 85000/34861*1000 ≈ €24.38, computed not stored)
  GET   /bookings/received                                            200  as creator — booking cmuhj0d2i000j12qdw6kt9f3f still agreedPriceCents:77600, untouched
  PATCH /creators/me {bundle5PriceCents:500000}                       400  "Bundle-of-5 price must be at least the single-post price and at most 5x it."
  PATCH /creators/me {}                                                400  "Provide at least one field to update."
  PATCH /creators/me {headline:"nope"}                                403  as brand — "Forbidden resource"
  PATCH /creators/me {postCostCents:77600,bundle5PriceCents:260623}  200  reset to original values
  ```
  `npx tsc -b` on `apps/api` — clean, no errors.
- 2026-09-26 — A2, campaigns the brand can choose between, with money against
  budget. `apps/api/**` only — `packages/shared` untouched (`CampaignOverview`
  and `CreateBookingBody.campaignId` were already correct from the round-2
  contract).
  - **New `GET /campaigns`** (COMPANY-only): the signed-in company's own
    campaigns, `Paginated<CampaignOverview>`. Ordering is LIVE, then DRAFT,
    then COMPLETED, newest first within each band — not a single Prisma
    `orderBy` (the enum's declaration order is DRAFT/LIVE/COMPLETED, not the
    wanted one), so `CampaignsService.list` fetches the company's campaigns
    (a handful per company, same "small catalogue, sort in memory" pattern
    `creators.service.ts` already uses for `best_match`) and sorts by a
    `STATUS_ORDER` map before paging the array. Money is one
    `prisma.booking.groupBy({ by: ["campaignId", "status"] })` over the
    *page's* campaign ids — `_sum.agreedPriceCents` + `_count._all` per
    (campaign, status) pair, folded up in memory into
    `pendingCents`/`committedCents`/`paidCents`/`bookingsCount` — not a query
    per campaign, per the ask. `committedCents` sums ACCEPTED, DRAFT_READY,
    SCHEDULED, LIVE, PAID (everything except INVITED and DECLINED) — the same
    set `money.ts`'s `IN_TRANSIT_STATUSES` uses plus PAID, kept as a local
    `COMMITTED_STATUSES` const rather than importing across modules for one
    array literal. `bookingsCount` counts every non-DECLINED status.
  - **`POST /bookings` accepts optional `campaignId`.** New
    `CampaignsService.getOwnedByCompanyOrThrow(companyId, campaignId)` — 404
    (never 403, same probing-concern pattern as `bookingOwnedByCreator`/
    `bookingOwnedByCompany`) when the id doesn't exist *or* belongs to another
    company, so a brand can't tell the two cases apart. A COMPLETED campaign
    is 409 `"This campaign is completed, so it can't take new bookings."` —
    but **only when `campaignId` was explicitly passed**: omitted keeps the
    original behaviour byte-for-byte, including a brand whose *active*
    campaign (the `getActiveForCompanyOrThrow` fallback) happens to be
    COMPLETED because they have no LIVE/DRAFT one — that was never blocked
    before this slice and still isn't. Going over budget is never checked —
    deliberately, per the ask ("that is the brand's call, and the web warns
    them"); nothing in `create()` reads `budgetCents` at all.
  - **Checked, not fixed:** `GET /creators?campaignId=` and both shortlist
    routes (`GET|POST /campaigns/:campaignId/shortlist`,
    `DELETE .../:creatorProfileId`) already work for any campaign id, active
    or not — none of the three assumed "active". `creators.service.ts`'s
    `resolveTargetVertical` takes an explicit `campaignId` and 404s only if
    it doesn't exist anywhere (no company/active check); the shortlist routes
    take `campaignId` as a path param and go through
    `CampaignsService.assertExists`, same deal. Verified live against a
    freshly created DRAFT campaign that was neither company's active one (see
    the verification log below) — both endpoints returned real data scoped to
    that campaign, nothing needed changing.
  - **Noted, not fixed:** `GET /campaigns/active` is still the *global*
    lookup (most recent LIVE across every company, or most recent of any
    status/company if none are LIVE) — `CampaignsService.getActive()`,
    unchanged since it was written for the marketplace-ranking use case
    before campaigns had per-company scoping anywhere else. Confirmed live,
    unauthenticated: `GET /campaigns/active` returns Ledgerly's "Fintech
    Trust Campaign" regardless of caller. **Doesn't matter with the current
    seed/demo**, because Ledgerly's LIVE campaign also happens to be the
    most-recently-created LIVE campaign globally (created after Vertice's
    LIVE "DevTools Integration Launch"), and the only real login this app
    ever demos is Ledgerly (`EntryPage.tsx`'s `BRAND_EMAIL`) — so the value
    it returns and the value a Ledgerly-scoped lookup would return are
    identical today. It **would** matter the moment a second brand
    (Vertice, seeded but never signed into by the demo entry) used the
    marketplace or booked without an explicit `campaignId`: they'd rank
    against and book into Ledgerly's campaign, not their own LIVE one — a
    real cross-company leak, just not one the current seed/demo path can
    reach. Only `creators.service.ts`'s no-`campaignId` fallback and
    `bookings.service.ts`'s no-`campaignId` fallback call the *company-scoped*
    `getActiveForCompany`/`getActiveForCompanyOrThrow` already, which is
    correct; it's only the
    public `GET /campaigns/active` endpoint itself (and whatever reads it
    directly) that's global. Left as-is per the ask.
  - **Verified on `localhost:3000`**, real tokens from `POST /auth/login`
    (Ledgerly = `growth@ledgerly.example.com`, creator Adam Bauer =
    `adam.bauer31@creators.naano.dev`), demo password for both:
    ```
    GET  /campaigns                                                200  as Ledgerly — 2 rows: Fintech Trust (LIVE, pending 0 / committed 1,829,575 / paid 598,493 / bookings 32), Summer Payouts (COMPLETED, committed=paid=1,447,040 / bookings 30) — LIVE-then-COMPLETED order
    ```
    Hand-check against `GET /bookings/sent?campaignId=<fintech>&pageSize=100`
    (35 rows, one page): summed by status — INVITED 0, {ACCEPTED,
    DRAFT_READY, SCHEDULED, LIVE, PAID} = 47,200 + 75,787 + 106,665 +
    1,001,430 + 598,493 = **1,829,575**, PAID alone = **598,493**, non-DECLINED
    count = 35 − 3 declined = **32** — exact match on all four figures.
    ```
    (created a temp DRAFT campaign for Ledgerly directly via Prisma, since the
    seed gives Ledgerly only one LIVE and one COMPLETED campaign — no
    non-active, non-completed one to book into; deleted it and its booking
    after)
    POST /bookings {campaignId:<temp DRAFT>, package:single, creator:Adam Bauer}   201  agreedPriceCents:47200 (= Adam's postCostCents)
    GET  /campaigns                                                                200  temp campaign now pendingCents:47200, bookingsCount:1 — bumped by exactly the booked price
    POST /bookings {campaignId:<Summer Payouts, COMPLETED>, creator:Adam Bauer}    409  "This campaign is completed, so it can't take new bookings."
    POST /bookings {campaignId:<Vertice's "Q4 RevOps Awareness">, creator:Adam Bauer}  404  "No campaign \"...\""
    POST /bookings  (as Adam Bauer, CREATOR role)                                  403  "Forbidden resource"
    GET  /campaigns (as Adam Bauer, CREATOR role)                                  403  "Forbidden resource"
    GET  /creators?campaignId=<temp DRAFT, non-active>                             200  real rows with real sectorFitPct (targetVertical FINTECH) — works for a non-active campaign
    GET  /campaigns/<temp DRAFT, non-active>/shortlist                             200  {items:[],total:0} — works for a non-active campaign
    ```
  - `npx tsc -b --force` on `apps/api` — clean, no errors.
- 2026-09-26 — A2 demo-data follow-up, `apps/api/prisma/demo-actions.ts` only
  (no route changed — this is data maintenance, not a new endpoint). The real
  A2 verification above used a temp Prisma-created campaign specifically
  *because* the seed leaves Ledgerly with only one LIVE campaign (already
  over its own budget: committed ~1,829,575 against budgetCents 1,500,000)
  and one COMPLETED one — the new campaign switcher / budget bar has nothing
  to switch to and a permanent over-budget warning on every fresh reseed.
  Extended `demo-actions.ts` with three more idempotent guarantees, same
  dry-run-by-default / `--local` / `--apply` guards as the existing
  booking-lifecycle top-up:
  1. **`"Fintech Trust Campaign"`'s `budgetCents` is bumped to at least
     2,500,000** (`FINTECH_TRUST_MIN_BUDGET_CENTS`) — only up, checked with a
     plain `<` so a database someone already fixed by hand isn't touched
     again.
  2. **Ledgerly gets a DRAFT campaign `"Payroll Compliance Series"`** if one
     doesn't already exist for that `companyId` + name (`budgetCents
     1,200,000`, `targetVertical HR_TECH`, `destinationUrl
     https://example.com/lp/payroll-compliance` — same path pattern every
     other seeded campaign uses) — a second non-LIVE row for the switcher to
     show, with realistic objective/brief/keyMessages/guidelines text
     matching the existing campaigns' tone (see `PAYROLL_CAMPAIGN` in the
     script).
  3. **`"Fintech Trust Campaign"` gets >= 1 fresh INVITED booking**
     (BRAND-initiated, `agreedPriceCents` from the chosen creator's own
     `postCostCents`) if it doesn't have one already — picks any creator with
     no existing non-declined booking in that campaign, same rule `POST
     /bookings` and the rest of this script already enforce.
  - **The identity-shift gotcha this surfaced:** `resolveDemoCreator()`
    (pre-existing, unchanged) picks "whoever the demo brand most recently
    booked" — the single most-recently-created `Booking` row, company-wide.
    The first version of guarantee 3 `.push()`ed its new INVITED booking onto
    the end of `newBookings`, so it was written *last* inside the apply
    transaction and became the new "most recent" — meaning the *next* run's
    `resolveDemoCreator()` resolved to that random creator instead of
    whoever it resolved to before, and `CREATOR_TARGETS` then had to top up
    INVITED/ACCEPTED/SCHEDULED for *them* too, one extra cycle deep. Caught
    this because the ask's own acceptance check (dry run → apply → dry run
    reporting nothing to do) failed on the first attempt — a second dry run
    immediately after the single `--apply` found two more bookings pending.
    Fixed by `.unshift()`ing the new INVITED plan instead of `.push()`ing it,
    so it's written *first* in the transaction and the existing
    `CREATOR_TARGETS`/`BRAND_TARGETS` bookings (whichever of those two loops
    actually writes something this run) stays the most recent one, same as
    before this slice touched the file at all — this addition doesn't change
    which creator the *next* run resolves as "the demo creator," it only
    matters for *this* run's own plan.
  - **Verified against the local dev database (`--local`):**
    ```
    npx ts-node prisma/demo-actions.ts --local            dry run: 6 changes — budget bump, new "Payroll Compliance Series", 4 bookings (2 pre-existing-mechanism top-ups for the then-current demo creator Nils Nilsson, 1 brand DRAFT_READY, 1 new Fintech Trust INVITED for Mateo Kowalski)
    npx ts-node prisma/demo-actions.ts --local --apply     applied all 6
    npx ts-node prisma/demo-actions.ts --local             dry run: found 2 MORE changes (Mateo Kowalski ACCEPTED + SCHEDULED) — the identity-shift gotcha above, not yet fixed at this point
    ```
    Fixed the ordering (`.unshift`), then converged:
    ```
    npx ts-node prisma/demo-actions.ts --local --apply     applied the 2 pending (Mateo Kowalski's own CREATOR_TARGETS top-up — legitimate, pre-existing mechanism, unrelated to the ordering fix itself)
    npx ts-node prisma/demo-actions.ts --local             "Nothing to do. Every target status already has a real row." — ran twice more to confirm it stays that way
    ```
    `GET /campaigns` as Ledgerly (`growth@ledgerly.example.com`), real token:
    ```
    Fintech Trust Campaign   LIVE      budgetCents 2,500,000  pendingCents 36,200   committedCents 1,965,075  paidCents 758,993   bookingsCount 35   (under budget, pendingCents > 0)
    Payroll Compliance Series  DRAFT   budgetCents 1,200,000  pendingCents 0        committedCents 36,200     paidCents 0         bookingsCount 1
    Summer Payouts Push     COMPLETED  budgetCents 900,000    pendingCents 0        committedCents 1,529,940  paidCents 1,447,040 bookingsCount 31
    ```
    Hand-checked Fintech Trust's row against `GET /bookings/sent?campaignId=<fintech>&pageSize=100` (38 rows, one page) the same way as the A2 entry above: INVITED 36,200; {ACCEPTED, DRAFT_READY, SCHEDULED, LIVE, PAID} sum 47,200 + 52,600 + 182,452 + 923,830 + 758,993 = **1,965,075**; PAID alone **758,993**; non-DECLINED count 38 − 3 declined = **35** — exact match on all four figures again.
  - `npx tsc -b --force` on `apps/api` — clean, no errors.
- 2026-09-26 — A5, how many bookings are waiting on the signed-in user.
  `apps/api/**` only — `packages/shared` untouched (`ActionCount` was already
  correct from the round-2 contract).
  - **New `GET /bookings/action-count`** (either role). The actionable-status
    set is derived, not hardcoded: new `actionable-statuses.ts` iterates every
    `BookingStatus` (from Prisma's own generated enum object, `Object.values`,
    not a hand-copied literal array — so it can't silently miss a status
    added later) crossed with both `hasDraft` values, calls `nextActionFor`,
    and keeps a status if either call returns a non-empty `consequence`. This
    made `actionableStatusesFor("CREATOR")` = `[INVITED, ACCEPTED, SCHEDULED]`
    and `actionableStatusesFor("COMPANY")` = `[DRAFT_READY, LIVE]` fall out of
    the existing `next-action.ts` table instead of being retyped by hand —
    the count can never drift from what "Next action" shows on `/received`/
    `/sent`, because it reads the same function.
  - **`BookingsService.actionCount(userId, role)`**: one `prisma.booking.count`
    scoped exactly like `listReceived` (`creatorProfileId`) for a CREATOR or
    `listSent` (`campaign: { companyId }`) for a COMPANY, `status: { in:
    actionableStatusesFor(viewer) }`. The controller reads `role` off the JWT
    payload (`@Roles("CREATOR", "COMPANY")`) rather than needing two routes.
  - **Declared before every `:id` route** in `bookings.controller.ts` (as the
    third `@Get`, after `received`/`earnings`, before `sent` and every
    `PATCH|POST :id/...` route) — no real collision today since GET has no
    other path-param route, but the ask was explicit, same "one line, no
    reason not to" call as A4's controller ordering.
  - **Verified against the running local API (`localhost:3000`)**, real
    tokens from `POST /auth/login` (Ledgerly = brand, Mateo Kowalski =
    creator):
    ```
    GET /bookings/action-count                    as creator   200  {count: 3}
    GET /bookings/action-count                    as brand     200  {count: 17}
    GET /bookings/received?pageSize=100           as creator   200  6 rows total, 3 with non-empty nextAction.consequence — matches
    GET /bookings/sent?pageSize=100                as brand     200  71 rows total, 17 with non-empty nextAction.consequence — matches
    POST /bookings/:id/draft (ACCEPTED -> DRAFT_READY, an actionable creator row going to a non-actionable one)
                                                    as creator   201  status DRAFT_READY, nextAction.kind await_brand
    GET /bookings/action-count                    as creator   200  {count: 2} — dropped by exactly one
    ```
  - `npx tsc -b --force` on `apps/api` — clean, no errors.
- 2026-09-26 — A6, bookings that need the viewer sort before everything else,
  across pages, not just within one loaded page. `apps/api/**` only.
  - **Problem**: both list endpoints ordered `createdAt desc` only, so an
    actionable row past page 1 was invisible, and the rail badge (which
    counts across all pages via A5's `action-count`) could disagree with what
    a page showed.
  - **`actionableFirst(rows, actionableStatuses)`**, new in
    `actionable-statuses.ts` next to `actionableStatusesFor` (same file,
    since the sort and the status set must never drift apart): a pure
    `Array.sort` — rows whose status is in the derived actionable set first,
    `createdAt desc` within each group. Both `listReceived` and `listSent`
    call `actionableStatusesFor(viewer)` for the set, so the order and A5's
    count read the exact same derivation and can't disagree by construction.
  - **Prisma can't order by a computed flag**, so both methods now follow
    `campaigns.service.ts`'s `list()` pattern: `findMany` with `select: {id,
    status, createdAt}` for the full scoped set (no `skip`/`take`), sort in
    memory with `actionableFirst`, slice the page's ids, then a second
    `findMany({ where: { id: { in: pageIds } } })` with the real `include` to
    load full rows — reordered afterward via a `Map`, since Prisma's `in`
    doesn't preserve the given id order. `listSent`'s existing `campaignId`/
    `status` filters are applied to the first (id-only) query, same as
    before.
  - **Verified against the running local API (`localhost:3000`)**, real
    tokens from `POST /auth/login` (Ledgerly = brand, Mateo Kowalski =
    creator), `pageSize=5` walked across every page:
    ```
    CREATOR /bookings/received   6 rows total, 2 pages — 1 actionable (SCHEDULED), sorted first on page 1; action-count {count: 1} — matches
    COMPANY /bookings/sent       71 rows total, 15 pages — 18 actionable, all sorted before every non-actionable row across all 15 pages; action-count {count: 18} — matches
    GET /bookings/sent?campaignId=<fintech>   38 rows — filter still scopes correctly with the new ordering
    GET /bookings/sent?status=LIVE            16 rows — filter still scopes correctly with the new ordering
    ```
  - `npx tsc --noEmit` on `apps/api` — clean, no errors.
- 2026-09-26 — A7, real aggregates for the Results dashboard. `apps/api/**`
  and `packages/shared` only. New `ClicksDay`/`StatusCount`/`ResultsOverview`
  in `packages/shared/src/api.ts`, new `GET /analytics/overview`
  (COMPANY-only) in the existing `analytics` module.
  - **One `booking.findMany`** (select `status`, `agreedPriceCents`,
    `trackedLink.id`) scoped to `campaign: { companyId }` — same
    small-catalogue justification `attribution` already uses (bounded by
    how many bookings one brand has ever made) — drives `bookingsByStatus`
    (zero-filled over a local `STATUS_ORDER` constant: INVITED, ACCEPTED,
    DRAFT_READY, SCHEDULED, LIVE, PAID, DECLINED — the lifecycle order
    asked for, not the enum's declaration order), `paidCents` (PAID only),
    `committedCents` (a local `COMMITTED_STATUSES` set — ACCEPTED through
    PAID — same set `campaigns.service.ts`'s A2 `COMMITTED_STATUSES` already
    uses, kept local rather than shared across modules for one set literal,
    same call `campaigns.service.ts` itself made), and the `TrackedLink` ids
    that feed the two click aggregates below.
  - **`totalClicksAllTime`** is one `clickEvent.count` over those tracked-link
    ids — no date filter, so it's exactly the same set `attribution` sums
    per creator, just totalled instead of grouped.
  - **`clicksByDay`** is a raw query (`Prisma.$queryRaw` + `Prisma.sql`/
    `Prisma.join` for the `IN` list) — `DATE_TRUNC('day', "createdAt")` +
    `COUNT(*)::int`, `GROUP BY day`, filtered to the last 30 days — per the
    ask, not a `findMany` that loads every `ClickEvent` into memory. Zero-fill
    happens in code: `emptyClicksDays()` builds all 30 UTC day buckets first
    (oldest first, today included, mirroring `bookings.service.ts`'s
    `emptyMonths()` pattern for the earnings chart), the raw rows are folded
    into it by day key, and `totalClicks30d` is just the sum of the
    zero-filled array rather than a second query.
  - **Verified against the running local API (`localhost:3000`)**, real
    token from `POST /auth/login` (Ledgerly = brand):
    ```
    GET /analytics/overview                200  30 entries in clicksByDay, oldest 2026-08-28 .. newest (today) 2026-09-26
    bookingsByStatus sum (4+1+3+5+15+44+4=76) == GET /bookings/sent total (76)
    totalClicksAllTime (1443) == sum of totalClicks across GET /analytics/attribution?pageSize=100 (1443, 38 rows, one page)
    GET /r/KK9DshtnBcbc (a real tracked link, Fintech Trust Campaign)  -> today's clicksByDay entry 0 -> 1, totalClicksAllTime 1443 -> 1444, totalClicks30d 658 -> 659
    GET /analytics/overview as the demo creator                       403 "Forbidden resource"
    ```
  - `npm run build:shared` clean; `npx tsc --noEmit` on `apps/api` — clean,
    no errors.

## Session: web, round 2

- 2026-09-26 — **W3, one filter panel.** naano splits filtering one list
  across two panels — inline industry/country/price, then a separate
  "Performance filters" panel with its own Apply button (RECON.md
  "Filters"). The API (`apps/api/src/creators/creators.service.ts`) already
  took every filter — `priceMinCents`/`priceMaxCents`, `maxCpmEur`,
  `minMedianViews`, `minFollowers`/`maxFollowers`, `minEngagementPct`,
  `postedWithinDays` — the web side exposed three. Folded the rest into
  `FilterPanel.tsx`'s existing panel as a second row (price range, max CPM,
  min median views, min engagement, posted within), same visual weight as
  row one, no second panel and no Apply button — every control applies the
  way industry/country/followers already do, number inputs debounced 250ms
  same as the search box and the follower-range fields. Price is the one
  unit conversion: the UI takes and shows whole EUR, the wire and the chip
  math both work in cents (`Math.round(eur * 100)`), same split as
  `formatCents` elsewhere.
- `packages/shared/src/api.ts`'s `ListCreatorsParams` and `http.ts`'s
  `creatorsQuery()` already covered every field before this session opened
  either file (both landed with the round-2 contract pass / were already
  correct) — W3 touched neither. `apps/web/src/lib/stores/creatorsStore.ts`
  gained the six new filter fields plus their setters and one
  `clearPerformanceFilters()` (used by both FilterPanel's Clear all and the
  empty state's Clear filters, so the two can't drift), same page-resets-to-1
  pattern as every existing setter. `fixtures.ts` extended to mirror
  price/CPM/median-views/engagement filtering — `postedWithinDays` is the one
  filter it can't mirror: `FIXTURE_CREATORS` carries no per-post publish date
  (posts are only synthesized on demand inside `getCreator()`), so that
  filter is a no-op there. Not a real gap: verification ran against the real
  API (`VITE_API_URL` at `:3000`), not fixtures mode.
- **The copy line** — "Filters hide creators. They don't change the sector
  fit score." — was checked against `apps/web` and the ranking code it calls
  before writing it, per the brief. `creators.service.ts.list()` builds a
  Prisma `where` from every filter param, fetches `rows`, *then* computes
  `fitById` via `scoreAudienceFit(row, { targetVertical })` over whatever
  `rows` survived the `where` (`audience-fit.ts`: vertical match 0.7 +
  follower tier 0.3, keyed only on the creator's own vertical/followers and
  the campaign's `targetVertical` — nothing filter-shaped in the formula).
  `bestMatchOrder()` (`ranking.ts`) then sorts by that same `fitById` map.
  So filtering narrows the candidate set the fit score gets computed over,
  but never touches the formula itself — the claim holds, confirmed by
  reading, not assumed.
- **Verification**: against the real API (`apps/api` already running on
  `:3000`, unmodified — this session opened no `apps/api` file per the
  brief's file boundary). For each new filter: set it alone, confirmed the
  network request carried the right param
  (`maxCpmEur=15`, `priceMinCents=10000&priceMaxCents=50000`,
  `minEngagementPct=3`, `postedWithinDays=90`) and the list shrank (40 → 2 on
  `maxCpmEur=15`, 40 → 21 on the €100–€500 price band). Combined `maxCpmEur`
  + `postedWithinDays` + `minEngagementPct` in one request, all three params
  present together, chips for all three, list still correct. Clear all reset
  every input and chip and returned to 40. One unrelated hiccup mid-session:
  the already-running `apps/api` dev process died on its own
  (`ERR_CONNECTION_REFUSED`, not triggered by anything W3 touched) —
  restarted with `npm run dev:api` (not an edit to `apps/api/**`, just
  running its existing script) and verification continued.
- **`npm run shots`**: ran it per the brief; it fails as flagged in this
  file's "Piece 2" entry above (2026-09-25) —
  `scripts/shots.mjs`'s brand block still waits on `[role="dialog"]`
  against the grid/modal UI that piece deleted, and that rewrite was
  explicitly deferred to "whoever runs the next full `npm run shots`
  regen," not scoped to W3 (CLAUDE.md rule 3: one task per session, don't
  refactor adjacent code you weren't asked to touch). Did the anti-slop
  check manually instead — a full-page 1440px screenshot of `/app` with all
  ten filter controls visible: one panel, two same-weight rows, no second
  "Performance filters" panel, no Apply button, tabular-nums columns hold,
  nothing competing for focal point. `scripts/shots.mjs` still needs that
  rewrite before its next regen; flagged again here, not fixed, since W3 is
  web-filters-only.
- 2026-09-26 — **Fix 1: filter panel input guards.** The W3 number inputs
  (`FilterPanel.tsx`) accepted a negative value or an inverted price range
  and silently sent it — `min={0}` on an `<input type="number">` blocks the
  spinner, not typing, so `-5` still reached `Number(input)` and, for
  example, `priceMinCents: -500` went straight onto the query string (the
  API's Prisma `range()` helper then builds a `gte: -500`, which every row
  satisfies — not an empty list, but not what the brand typed either).
  `DebouncedNumberFilter` (max CPM, min median views, min engagement) now
  takes an optional `max` prop and rejects `NaN`/negative/over-max in the
  debounce handler itself, before it ever calls `onChange`: on a bad value it
  sets local `invalid` state and returns, so the committed filter (and any
  chip) stays exactly where it was. `PriceRangeFilter` does the same for
  negative min/max, plus a third check — parses both sides, and if
  `minCents > maxCents` sets an `inverted` flag instead of sending, with one
  inline line under the inputs ("Min price is above max price.",
  `text-label text-warn`, the same token `BookingRail`'s retryable-error line
  and `EntryPage`'s inline error already use — no new token). Added `invalid`
  as a boolean prop on the `Input` primitive itself (`ui/Input.tsx`) rather
  than fighting Tailwind class-order to override `border-border` from a
  call-site className: it swaps `border-border`/`focus:border-primary` for
  `border-warn`/`focus:border-warn` and sets `aria-invalid`. Reused token,
  no new colour. The typed text is never wiped in any of these cases — only
  the local input string state changes on keystroke; the prop-driven sync
  effect that would overwrite it only fires when the *committed* value
  changes, and an invalid value never commits. Followers (`FollowerRangeFilter`)
  and posted-within (a `Select`, not free text) were out of scope and
  untouched. Verified against the real API (`:3000`): `-5` in Max CPM sent no
  request and produced no chip; `150` in Min engagement, same; price min
  `500` / max `100` showed the inline message and sent nothing; correcting
  all three in one pass produced one request carrying
  `priceMinCents=10000&priceMaxCents=50000&maxCpmEur=25&minEngagementPct=3`
  and three chips.
- 2026-09-26 — **Fix 2: `npm run shots` works again.** Rewrote
  `scripts/shots.mjs` end to end against the UI that actually exists (flagged
  broken twice already — the 2026-09-25 "Piece 2" entry and this file's W3
  entry above — both explicitly deferred it). The old suite's brand block
  clicked "Book" and `waitForSelector('[role="dialog"]')`: both the grid and
  the modal were deleted in the 2026-09-25 redesign, replaced by
  `CreatorComparisonList` + the persistent `CreatorDetailPanel`. New shot
  list: `entry-page`, `marketplace` (list + panel, default first-row
  selection), `marketplace-detail-panel` (a second row clicked, panel
  swapped), `marketplace-filters` (Max CPM set to 30, its chip visible — the
  one-panel W3 filter set the brief asked this fix to also cover),
  `collaborations` (brand), `results` (new — 5.4 had no shot before this),
  `creator-profile`, `creator-collaborations`, `creator-earnings`,
  `error-state`. Every wait is on something real, never a fixed timeout:
  clicking a row waits on the `GET /creators/:id` response that click
  triggers (`page.waitForResponse`, run in parallel with the click via
  `Promise.all` so the response can't fire before the listener attaches);
  setting Max CPM waits on the response whose URL contains `maxCpmEur=30`;
  Results/Collaborations/Earnings each wait on a `.or()`-combined locator
  covering whichever of their real states (a table/cards vs. one of their
  empty states) actually renders, since both are legitimate and neither is
  forced. The `ensure-invited` dev-endpoint call survives (same reasoning as
  before — seed's random status assignment means a fresh POST /bookings
  could always 409), now feeding `creator-collaborations` instead of the
  deleted `creator-home`/`creator-booking-requests`. One thing discovered,
  not fixed here (out of scope — apps/api is off limits this session): the
  creator `ensure-invited` targets (Emma Berg, by name) is not guaranteed to
  be the same creator `GET /auth/demo-creator` signs "Continue as a creator"
  into (whoever Ledgerly *most recently* booked) — this run signed in as Elin
  Halvorsen, so `creator-collaborations.png` shows two informational cards,
  not the actionable Accept/Decline state. The shot still correctly shows the
  current `CollaborationCard` UI against real data; only the specific
  actionable-state coverage is a pre-existing gap, flagged for whoever next
  touches `GET /auth/demo-creator` or `ensure-invited`. Verified: `npm run
  shots` against the real API (`:3000`) finished clean, wrote all ten files,
  the only console output was the `ERR_FAILED` lines the deliberate
  `page.route(...).abort()` in the `error-state` block always produces (same
  as the old suite). Opened `marketplace.png`, `marketplace-filters.png`, and
  `creator-collaborations.png` — all three render the current UI correctly.
- **Incidental, both fixes**: the already-running `apps/api` dev process
  died on its own again mid-session (`ERR_CONNECTION_REFUSED`, unrelated to
  either fix, same as the hiccup logged in the W3 entry above) — restarted
  with `npm run dev:api` (not an edit to `apps/api/**`) both times
  verification needed it back.
- Also fixed while reading this file for the required-reading step: the W3
  entry above had ended with a stray duplicated "it at once." (an artifact of
  that session's own edit tool call landing after, not instead of, the
  original text it was appending to) — removed; no content change, only the
  leftover fragment.
- 2026-09-26 — **W1, booking lifecycle on both sides, draft to paid.**
  `apps/web/**` only, per A1's contract (`packages/shared/src/api.ts`
  untouched — already correct, confirmed while building against it).
  - **API layer.** `lib/api/client.ts`/`http.ts` gained `submitDraft`,
    `markPublished`, `approveDraft`, `requestChanges`, `markPaid` (all thin
    `POST` wrappers, no request body for the three no-body actions);
    `listBookingsSent` widened to `Paginated<BrandCollaboration>` — the same
    type-only bump `CreatorCollaboration` went through for the creator side.
    `fixtures.ts` mirrors the full state machine so fixture mode keeps
    working: a new `FixtureBooking` (adds `draftContent`/`postUrl`, neither on
    `BookingSent`), a duplicated `fixtureNextAction` (mirrors
    `apps/api/src/bookings/next-action.ts`'s status+viewer+hasDraft table —
    same "keep two copies in sync by hand" pattern `SORTERS` already uses for
    `ranking.ts`) and a duplicated `fixtureNetCents` (mirrors `money.ts`'s
    `COMMISSION_PCT` math). Each new action checks the booking's current
    status against the one transition it allows and 409s with the same
    "This booking is X, so it can't be Y." shape the real API uses, otherwise
    fixtures would silently accept an out-of-order call the real API would
    reject.
  - **Found and fixed a real bug while verifying the publish 400 case**:
    `http.ts`'s `request()` only read `body.message` as a string, but Nest's
    `ValidationPipe` reports field errors as a string array (exactly what
    `MarkPublishedDto`'s non-LinkedIn-URL check returns) — so the actual
    validation sentence never reached the UI, only a generic
    "`/bookings/:id/publish` failed with status 400" fallback. Since "show the
    API's message inline on that row" is the acceptance bar for every one of
    these five actions, this wasn't a side quest — fixed by also accepting a
    string array and joining it. Confirmed live: a `https://example.com/...`
    postUrl now shows "postUrl must be an https link on linkedin.com, x.com or
    twitter.com" on the row, not the fallback.
  - **Creator Collaborations** (`components/creator/CollaborationCard.tsx`,
    `routes/CreatorCollaborationsPage.tsx`): the tinted panel now branches on
    `nextAction.kind`. `submit_draft` is a textarea (seeded from
    `draftContent` so a resubmit after request-changes starts from the old
    text, per the ask) with a live `N / 3000` count and a "Send for review"
    button disabled empty/over-limit/in-flight. `publish` is the tracked link
    (reusing `TrackedLinkRow`) + a plain URL `Input` + "Mark as published" —
    deliberately no client-side domain check, so the 400 case above is a real
    round trip, not a guard that never lets a bad URL leave the browser.
    `respond` unchanged. Every action: `busyId` disables just that row's
    buttons; `submitDraft`/`markPublished` replace the row in place with the
    full returned `CreatorCollaboration` (it carries the recomputed
    `nextAction`, so no refetch needed — unlike `respond`, which still
    refetches because `updateBookingStatus` only returns a bare `Booking`);
    failures land in a per-row `errors` map, read off `err.message` (the
    `ApiError`'s own message, already the server's text after the fix above).
  - **Brand Collaborations** (`components/campaign/CollaborationsTable.tsx`,
    `routes/CollaborationsPage.tsx`): rather than switching the brand's table
    to the creator's card layout, the table gained a seventh "Next action"
    column — same tinted-panel-vs-plain-line rule as the creator side (so the
    pattern reads as one system per the ask), but the existing Creator/
    Campaign/Package/Agreed price/Status/Tracked link columns, the `?status=`
    filter, and `CreatorsPagination` are all untouched, exactly as asked.
    `review_draft` shows the draft text (`line-clamp-3`) then Approve/Ask for
    changes; `mark_paid` shows a "View the live post" link to `postUrl` (not
    the tracked link — a different URL, the actual published post) then
    "Mark as paid (amount)" with the gross `agreedPriceCents`, then the fixed
    "Payment rails aren't built..." line. Rows sort actionable-first
    (`orderByNextAction`, the same stable-sort shape
    `CreatorCollaborationsPage` already used) on the current page only — the
    server-side `?status=`/pagination contract doesn't change. No em dashes
    were introduced in any new copy (checked by re-reading every string
    written this session, per the ask) — "Mark as paid (amount)" uses
    parentheses, not the em-dash-joined phrasing drafted first.
  - **Verified against the running local API (`:3000`, unmodified — no
    `apps/api` file opened) and in the browser**, walking one real booking
    through the whole loop rather than relying on whatever the seed happened
    to leave in each state: booked a fresh creator (Nils Nilsson, previously
    unbooked in Fintech Trust Campaign, via the ordinary marketplace Book
    flow — `demo-actions.ts` was not run, per the ask) so "Continue as a
    creator" resolved to him for a clean multi-step session. Accept (creator)
    → mints the tracked link, submit_draft panel appears with a live
    `0 / 3000` count. First draft (creator) → row moves to Draft ready,
    brand's Next action shows "Review the draft..." with the draft text.
    Ask for changes (brand) → row back to Accepted, "Waiting for the
    creator's revised draft."; creator's panel now reads "The brand asked for
    changes. Revise your draft and send it again." with the textarea
    pre-filled with the old text (confirms `hasDraft` branching end to end).
    Revise and resend (creator) → Draft ready again, brand sees the new text.
    Approve (brand) → Scheduled, creator's panel becomes the publish form
    (tracked link + URL input + "Mark as published"). Publish with
    `https://example.com/not-linkedin` → 400, the real validation sentence
    shown inline on the row (the bug above, caught by this exact step).
    Publish with a `linkedin.com` URL → Live, brand's row becomes "The post
    is live..." with a working "View the live post" link. Mark as paid
    (brand) → Paid, creator's row becomes "Nothing to do.". Creator Earnings,
    before vs. after that one mark-paid: total earned €0 → €663, in transit
    €1,310 → €647 — both moved by exactly €663 (net of the booking's €829
    agreed price at the 20% `COMMISSION_PCT`, confirming `netCents` isn't
    drifting between the two figures), and the current month's chart bar grew
    from empty to the new total. Separately, on the existing seed data (no
    fresh booking needed): approved Marco Romano's draft and marked Elin
    Halvorsen's live post paid as the brand, both landing correctly before
    the fresh-booking walkthrough above.
  - **`npm run shots`**: ran clean on retry (a first attempt hit Playwright's
    `networkidle` wait timing out on a cold Vite compile, not a real failure —
    the dev server needs a request to actually finish compiling before
    Playwright's own navigation, and the first hit of the session is always
    the slow one). All ten shots regenerated; `collaborations.png` and
    `creator-collaborations.png` opened and checked against DESIGN.md's
    anti-slop list — new "Next action" column reads as one tinted-panel
    system with the creator side, tabular-nums holds on the price column, no
    gradient/shadow/em-dash anywhere new. The four `ERR_FAILED` console lines
    this run are `randomuser.me` avatar fetches failing in this sandboxed
    network — pre-existing, unrelated to this slice (`ui/Avatar`'s
    initials-first rendering already covers it), not the deliberate
    `error-state` abort this suite also produces.
  - `npx tsc -b apps/web/tsconfig.json` — clean, no errors, run twice (before
    and after the `http.ts` message-array fix).
- 2026-09-26 — **Fix 3: brand can read the full draft before approving.**
  `components/campaign/CollaborationsTable.tsx`'s `review_draft` panel
  clamped the draft to `line-clamp-3` with no way to read the rest — a
  brand had to Approve or Ask for changes on a draft it couldn't fully see.
  New `DraftText` (replaces the bare clamped `<p>`): a `useLayoutEffect`
  measures the real DOM (`scrollHeight` vs `clientHeight` while still
  clamped) rather than guessing from character count, since whether
  `line-clamp-3` actually truncates depends on real layout — font size,
  the column's `max-w-xs`, and the draft's own line breaks. A "Show full
  draft" / "Show less" text toggle (same `text-label font-medium
  text-primary` treatment as the table's own "Copy link") appears only
  when that measurement says the text overflows; a short draft (Ava
  Dubois's seed example, two lines) shows no toggle at all. Verified
  against the real API (`:3000`): submitted a five-line draft as a
  creator (accepted a fresh Fintech Trust Campaign invitation, sent it for
  review), then reviewed it as the brand — clamped to 3 lines with "Show
  full draft" visible, clicking it revealed all five lines and flipped the
  toggle to "Show less", clicking again re-clamped. Ava Dubois's existing
  short draft alongside it correctly showed no toggle.
- 2026-09-26 — **W4, a creator edits their own card and price.**
  `apps/web/**` only, per A4's contract (`packages/shared/src/api.ts`'s
  `UpdateMyCardBody` untouched — already correct from the round-2 contract
  pass, confirmed while building against it).
  - **API layer.** `lib/api/client.ts`/`http.ts` gained `updateMyCard` — a
    thin `PATCH /creators/me` wrapper, same shape as every other action in
    the file. `fixtures.ts` mirrors `apps/api/src/creators/creators.service.ts`'s
    validation by hand (same "no real server to ask" reasoning
    `fixtureNextAction` already uses for A1) — "at least one field",
    headline 1..160 trimmed, both prices integer 5,000..2,250,000 cents,
    and the bundle-vs-post cross-check evaluated after merging onto the
    stored row. There's still no real creator-mode fixture session
    (`FIXTURE_ME` is always the brand, same limitation `listBookingsReceived`
    and `getEarnings` already flag) — `updateMyCard` mutates a fixed
    stand-in (`FIXTURE_SELF_CREATOR_ID = "fixture-1"`, the creator
    `FIXTURE_CREATOR_EMAIL` already names) so the client still type-checks
    and behaves plausibly if this ever becomes reachable; unreachable today
    the same way `updateMyCard` itself is, since `CreatorHomePage` never
    renders past its error state when `creatorProfileId` is null.
  - **`routes/CreatorHomePage.tsx`.** "Edit card" (top-right of the profile
    card, `Button variant="secondary"`) swaps the header + metrics block for
    an in-place form — no modal, no route change — via one `editing` boolean;
    Audience snapshot and Recent posts below stay mounted and unaffected.
    The form: headline text input, single post price (EUR) and bundle of
    five price (EUR) — both entered in whole/decimal EUR and converted with
    `Math.round(eur * 100)`, the same inline conversion `FilterPanel`'s
    `PriceRangeFilter` already uses, not a new shared helper. Each price
    field shows its own live CPM underneath via `formatCpm` (wraps the
    shared `cpmCents`, never a copy of the formula) — the bundle field
    divides by five first (`Math.round(bundleCents / 5)`), the same
    per-post convention `BookingRail` already uses for its own bundle CPM.
    Client-side validation mirrors the API's DTO/service rules exactly
    (`MIN_PRICE_CENTS`/`MAX_PRICE_CENTS` constants duplicated with a "keep
    in sync with the DTO" comment, same pattern the DTO itself uses pointing
    at the shared doc comment) and disables Save while invalid, with the
    same three inline messages the API would 400 with; a genuine API
    rejection (network race, anything client validation didn't catch) still
    surfaces via `err.message` off `ApiError`, same pattern every other
    action's error row already uses. Save calls `updateMyCard` and replaces
    `detail` with the response directly (no refetch); Cancel discards the
    form's local state and returns to the display view unchanged. Also
    added a "Bundle of 5" metric tile and a headline line (`OverviewTab`'s
    own muted-paragraph treatment) to the display view — neither rendered
    before this slice, but editing a price/field the view never showed
    would have been confusing, and the metrics grid widened
    (`sm:grid-cols-3 lg:grid-cols-5`) to fit the fifth tile without letting
    any column shift width.
  - **Verified against the running local API (`:3000`, unmodified) and in
    the browser**, signed in as the demo creator (resolved to Mateo
    Kowalski this run): opened Edit card, typed a bundle price 2000 with a
    362 single-post price (over 5x) — inline "Bundle-of-5 price must be at
    least the single-post price and at most 5x it." appeared immediately
    while typing, Save stayed disabled, no request sent. Corrected to a
    real change (single post €362 → €400, CPM €23 → €25 live as typed) and
    saved — 200, view mode returned with the new figures, no refetch flash.
    Signed in as the brand (Ledgerly), searched the marketplace for Mateo
    Kowalski: row showed the new €400 post cost and €25 CPM, matching what
    the creator side saved. Signed back in as the creator and reset both
    prices to their original values (€362 / €1,217.27) — saved cleanly,
    confirmed back to the original CPM figures (€23 / €15).
  - **`npm run shots`**: ran clean, all ten shots regenerated;
    `creator-profile.png` (view mode, "Edit card" button + five-tile metrics
    row including the new Bundle of 5 tile) opened and checked against
    DESIGN.md's anti-slop list — tabular-nums holds across all five tiles,
    one button style, no gradient/shadow/em-dash. Edit mode itself isn't in
    the shot suite (no shot list entry crosses a click into it); checked
    manually instead via the browser at 1440px during the verification
    above — token colours/radius/spacing throughout, "Save"/"Cancel" not
    "Submit", the `--warn` token on invalid fields matching `Input`'s
    existing `invalid` prop, no new component primitive introduced. The
    four `ERR_FAILED` console lines this run are the same pre-existing
    `randomuser.me` avatar-fetch issue flagged in the W1 entry above,
    unrelated to this slice.
  - `npx tsc --noEmit` on `apps/web` — clean, no errors, run twice (once
    after the draft-toggle fix above, once after this slice).
- 2026-09-26 — **W2, campaign switcher and budget bar.** `apps/web/**` only,
  per A2's contract (`CampaignOverview`/`CreateBookingBody.campaignId` in
  `packages/shared/src/api.ts` untouched — already correct from the round-2
  contract pass).
  - **API layer.** `lib/api/client.ts`/`http.ts` gained `listCampaigns` — a
    thin `GET /campaigns` wrapper, same shape as every other list method.
    `fixtures.ts` gained a second fixture campaign (`fixture-campaign-2`,
    DRAFT) alongside the existing LIVE one so the switcher has something real
    to switch between in fixtures mode; `createBooking` now resolves
    `body.campaignId` to one of the two fixture campaigns (falling back to
    the original LIVE one when omitted, same "omitted means active" contract
    the real API uses) instead of hardcoding the one campaign, and 409s a
    completed one — there wasn't one before this slice, so this is new
    fixture behaviour, not a widen. `listCampaigns`'s fixture impl derives
    money the same way `campaigns.service.ts` does (`COMMITTED_STATUSES`
    mirrored by hand, same "no real server to ask" pattern every other
    fixture mirror in this file already uses) rather than storing it.
  - **New `campaignStore.ts`.** `{campaigns, selectedCampaignId, status}`.
    `hydrate()` is idempotent and safe to call again after anything that
    could move the money: it keeps the current selection if it's still in
    the refetched list, and only falls back to a default (the company's
    remembered choice in `localStorage["naano.campaign.<companyId>"]`, else
    `GET /campaigns/active`, else the first campaign) when there's no valid
    current selection — so a post-booking refresh never yanks the switcher
    back to the default. The localStorage read/write is wrapped in
    try/catch per the ask, keyed per company (read via `authStore.getState()`
    rather than a prop, since the store needs it both on hydrate and on
    every `select()`).
  - **Wiring in `CreatorsListPage.tsx`.** `shortlistStore`/`bookingsStore`
    `hydrate()` both gained an optional `campaignId` param (omitted keeps
    the old default-active-campaign behaviour, so neither store's contract
    changed for any caller that doesn't pass one) — the page now re-hydrates
    both, keyed to `campaignStore`'s `selectedCampaignId`, on every campaign
    change, and `campaignId` was added to the `listCreators` request +
    effect deps so switching re-ranks the list. `MarketplaceHeader` gained
    a "Ranked for" `Select` (campaign name, "(completed)" suffix for a
    completed one so the switcher itself explains why Book might be
    disabled) — the old static "Ranked for your company" sentence in the
    subtitle was dropped rather than kept alongside it, per the same
    anti-three-restatements reasoning slice 2.4 already applied to this
    exact phrase.
  - **New `CampaignBudgetBar.tsx`.** One bar, three segments (paid,
    committed-but-unpaid = `committedCents - paidCents`, pending) as a
    percentage of `budgetCents`, capped at 100% width — going over budget
    shows as a warning line below, never a segment overflowing the track.
    Tints are the same `color-mix(in srgb, var(--primary) …%, white)`
    approach `ui/SegmentedBar.tsx` already uses (one accent token, not a
    decorative palette). Two caption lines exactly as asked ("€X committed
    of €Y", "€Z invited, not yet accepted") plus a conditional `text-warn`
    line when `committedCents + pendingCents > budgetCents`. Rendered
    between `MarketplaceHeader` and the tab/filter content, unconditionally
    (both All-creators and Shortlist tabs), since it's campaign context, not
    list content.
  - **`BookingRail.tsx`** gained a `campaign: CampaignOverview | null` prop
    (threaded through `CreatorDetailPanel`). Two new pieces of copy, neither
    blocking except the second: a projection warning
    (`committedCents + pendingCents + packageCents > budgetCents`) — this
    booking would start INVITED, i.e. add to *pending*, not committed, so
    the projection has to add the new package price on top of both existing
    figures, not just committed — shown above the confirm button in the
    warn token, booking still submits normally (per the ask, "that is the
    brand's call"); and a `campaign.status === "COMPLETED"` line
    ("This campaign is completed, so it can't take new bookings.") that is
    always rendered as real text, not a `title` attribute, alongside
    genuinely disabling the confirm button — a hover-only tooltip would
    have failed the ask's "not only on hover" explicitly. `createBooking`
    now sends `campaignId: campaign?.id` so a booking lands in whichever
    campaign the marketplace is ranked for, not always the company's
    default active one; on success the rail calls
    `useCampaignStore.getState().hydrate()` (a plain store read, not a
    subscription — the rail doesn't need to re-render on other campaigns'
    numbers moving) so the budget bar reflects the new booking without a
    page reload.
  - **Verified against the running local API (`:3000`, unmodified) and in
    the browser**, signed in as Ledgerly: switching the "Ranked for" select
    between Fintech Trust Campaign (LIVE) and Payroll Compliance Series
    (DRAFT) re-ranked the list, changed the shortlist tab's count (6 → 0),
    and changed which rows read "already booked" — confirming the re-key
    reaches both stores, not just the ranking. Switching to Summer Payouts
    Push (COMPLETED, seeded committed €15,299 against a €9,000 budget)
    showed "€6,299 over budget" on the bar in the warn token; opening an
    unbooked creator's rail there showed the always-visible "This campaign
    is completed..." line and confirmed via the DOM that the confirm
    button's own `disabled` property was `true`, not just styled to look
    disabled. On Payroll Compliance Series (budget €12,000, committed €362,
    €0 pending going in): booked four bundle-of-5s in sequence (creators at
    various post costs) and watched the budget bar's "invited, not yet
    accepted" figure and pending segment grow after every single one with no
    manual refresh, confirming the post-booking refetch; the fourth booking
    (committed+pending projected to €14,024 against the €12,000 budget)
    showed "This booking would put the campaign €2,386 over budget." above
    an enabled confirm button, and submitting it succeeded — the bar
    afterward read exactly "€362 committed of €12,000 / €14,024 invited, not
    yet accepted / €2,386 over budget," matching the projection to the cent.
    Reloading the page after switching to Payroll Compliance Series kept it
    selected (the `localStorage` remember-per-company path), confirmed via
    `Object.keys(localStorage)` showing `naano.campaign.<Ledgerly's company
    id>` before the reload and the same campaign still selected after it.
  - **`npm run shots`**: ran clean, all ten shots regenerated (`marketplace`
    and `marketplace-filters` both now show the switcher + budget bar);
    opened both and checked against DESIGN.md's anti-slop list — tabular-nums
    holds on the bar's two caption lines, one accent colour throughout (no
    new palette for the bar's segments), no gradient/shadow, the switcher and
    the subtitle no longer both claim "ranked for your company."
  - `npx tsc -b apps/web/tsconfig.json` and `npx tsc -b apps/api/tsconfig.json`
    (sanity check, `apps/api` untouched this slice) — both clean.
- 2026-09-26 — **Fix 4: `CampaignBudgetBar` legend.** The bar's three
  segments (paid, committed-but-unpaid, invited) had no legend, and the
  headline line named only the committed figure — a viewer couldn't read the
  paid amount anywhere. Added a one-line legend under the bar: three small
  `TINTS`-coloured swatches (same dot pattern `ui/SegmentedBar.tsx` already
  uses) labelled "Paid €X", "Committed €Y" (committed-but-unpaid, i.e.
  `committedCents - paidCents`, already computed as `committedNotPaidCents`
  for the bar's own middle segment width — reused, not recomputed), "Invited
  €Z" — the three sum to what the bar shows. The existing "€X committed of
  €Y" headline and "€Z invited, not yet accepted" line are unchanged. Tokens
  only, no new component.
- 2026-09-26 — **W5, rail badge.** `apps/web/**` only, per A5's contract
  (`ActionCount` in `packages/shared/src/api.ts` untouched — already correct
  from the round-2 contract pass).
  - **API layer.** `lib/api/client.ts`/`http.ts` gained `getActionCount` — a
    thin `GET /bookings/action-count` wrapper, same shape as every other
    method. `fixtures.ts`'s implementation derives the count from its own
    `fixtureBookings` via the existing `fixtureNextAction` (viewer fixed to
    `"COMPANY"`, since `FIXTURE_ME` is always the brand — same limitation
    `listBookingsReceived`/`getEarnings`/`updateMyCard` already flag) rather
    than a second hardcoded rule, so it can't drift from the state machine
    the other fixture actions already update.
  - **New `lib/stores/actionCountStore.ts`.** `{count, refresh}` — the
    smallest store in the app on purpose: one number, one action. `refresh()`
    swallows a failed request and leaves the last known count rather than
    flashing the badge to zero on a transient blip (same reasoning
    `bookingsStore`'s hydrate-error path uses, applied to a single number
    instead of a map). Deliberately not wired to any polling interval — the
    ask was "fetch on mount and after every lifecycle action," not a ticking
    background refresh.
  - **`AppShell.tsx`.** `useEffect` calls `refresh()` once when `me` becomes
    non-null (covers sign-in and a page-load rehydrate alike). The badge
    itself: a small `rounded-full bg-primary` circle, absolutely positioned
    on the Collaborations icon's button (`key === "collaborations"`, true for
    both `BRAND_RAIL` and `CREATOR_RAIL`), rendered only when `count > 0`.
    `role="status"` + `aria-label={`${count} collaborations need you`}`
    carries the count to assistive tech directly, separate from the button's
    own `aria-label` (the nav item's name) so neither overwrites the other.
    `text-[10px]` for the numeral has one existing precedent in the codebase
    (`marketplace/icons.tsx`'s small circular metric badge) rather than being
    a new arbitrary value invented for this slice.
  - **Refresh wiring.** Both pages call `useActionCountStore`'s `refresh`
    from the exact point W1 already handles success, per the ask — no new
    success path introduced: `CreatorCollaborationsPage.tsx`'s `respond`
    (covers both accept and decline), `submitDraft`, and `publish`; and
    `CollaborationsPage.tsx`'s single `run()` helper, which already covers
    all three brand actions (approve, request changes, mark paid) in one
    place. No polling anywhere.
  - **Verified against the running local API (`:3000`, unmodified) and in
    the browser**, both demo accounts. Brand (Ledgerly): `GET
    /bookings/action-count` returned `{count: 18}`, matching exactly the 18
    rows in `GET /bookings/sent?pageSize=100` whose `nextAction.consequence`
    is non-empty (checked by counting, not eyeballing). Creator (resolved to
    Clara Keller via `GET /auth/demo-creator`): `action-count` returned
    `{count: 1}`, matching the 1 actionable row in `GET
    /bookings/received?pageSize=100` (an `INVITED` booking, `kind: "respond"`).
    Accepting that invitation (`PATCH .../status`) moved it to `ACCEPTED`,
    which is still in the creator's actionable set (`kind` becomes
    `"submit_draft"`) — count correctly stayed at 1, not a false "drop."
    Submitting the draft moved it to `DRAFT_READY` (`kind: "await_brand"`,
    not actionable for the creator) — count dropped 1 → 0, and the brand's
    own count rose 18 → 19 in the same step (the same booking became
    actionable for the other role, `kind: "review_draft"`), confirming the
    two sides' counts move independently and correctly off the same
    transition. In the browser (signed in as Ledgerly on the live
    `:5173` session): the rail badge read "19 collaborations need you"
    (`aria-label`, confirmed via the accessibility tree, not just the visible
    number) before any click; clicking a real "Mark as paid" button on the
    Collaborations table dropped it to "18" immediately, with no page reload
    — confirming the whole chain (action succeeds → `refreshActionCount()` →
    store updates → badge re-renders) works end to end, not just the
    underlying count formula. Signed in as the creator with zero actionable
    bookings (all three of Clara Keller's collaborations were `await_brand`/
    `none`): the Collaborations icon rendered with no badge at all — hidden
    at zero, confirmed live, not just by the `count > 0` guard reading
    correctly in isolation.
  - **`npm run shots`**: ran clean before the live mark-paid verification
    above; all ten shots regenerated (`collaborations.png` shows the badge at
    19 alongside the rail icon's tooltip; `creator-collaborations.png` shows
    the same icon with no badge for a creator with nothing actionable). Six
    `ERR_FAILED` console lines this run: four are the pre-existing
    `randomuser.me` avatar-fetch issue flagged in earlier entries, two are
    the deliberate `page.route(...).abort()` calls the `error-state` block
    always produces — not a regression.
  - `npx tsc -b apps/web/tsconfig.json` — clean, no errors.
- 2026-09-26 — **W9, Results becomes a real dashboard.** `apps/web/**` only
  (`ResultsPage.tsx`, `components/dashboard/**`, the api-client hedge). Sits
  on top of A7's `GET /analytics/overview`, already live; this slice is the
  UI that reads it.
  - **Four new files, one per panel, no shared "chart" abstraction.**
    `KpiRow.tsx`, `ClicksChart.tsx`, `BookingPipeline.tsx`,
    `ClicksByCreator.tsx`, `SpendByCampaign.tsx`. Each is a plain component
    taking exactly the slice of `ResultsOverview`/`CampaignOverview`/
    `AttributionRow` it needs, not a generic `<Chart kind="bar">` — four
    small files, each readable on its own, beat one flexible one this build
    doesn't have time to get right.
  - **`ClicksChart` is inline SVG, same restraint as `EarningsChart`/
    `ReachSparkline`**, no charting dependency added (CLAUDE.md, "ask before
    adding a dependency"). A label every 7th day keeps 30 dates legible.
    Hover/focus needs an exact day and count, not just a bar's height, so
    each bar gets a second, invisible full-height `<rect>` as its hit target
    (a light day's real bar can be 1-2px tall) with `tabIndex`/`aria-label`
    for keyboard focus, and a small tooltip positioned off the active bar's
    own x-position, not centered. All-zero renders a plain empty sentence
    instead of 30 flat bars.
  - **`BookingPipeline` reads `bookingsByStatus` into a `Map` by status**,
    not by array index, even though A7's `STATUS_ORDER` already returns it
    lifecycle-ordered zero-filled, so this component doesn't silently break
    if that ordering ever changes server-side. Labels are the plain-word
    set the brief asked for ("Draft in review" for `DRAFT_READY`), which is
    deliberately not `bookingStatusLabel()` from `lib/bookingStatus.ts`
    (that one says "Draft ready" and is tuned for a status pill, not a
    pipeline row) — a second, local label map, not a shared one edited to
    serve two callers with different needs. DECLINED renders separately,
    muted, below a divider: it's a dead end, not a pipeline stage, and
    stacking it inline with the six live ones would have implied a booking
    passes through it on the way to somewhere.
  - **`ClicksByCreator` takes `listAttribution({ page: 1, pageSize: 8 })`
    as-is** for "top 8" rather than re-deriving a top-N client-side: the
    endpoint already sorts `totalClicks` desc (5.4), so the first page at
    `pageSize: 8` is the top 8 by construction, no new query param needed.
  - **`SpendByCampaign` duplicates `CampaignBudgetBar`'s width math**
    (paid/committed-not-paid/pending capped at 100%, same three
    `color-mix` tints) rather than importing it: `CampaignBudgetBar` renders
    one campaign as a full `Card` with two legend rows and an over-budget
    warning; this panel needs one compact row per campaign inside a grid
    tile that might hold several. Same formula, deliberately not the same
    component, because the two call sites want different amounts of chrome
    around it.
  - **Spend-per-click needed a second currency formatter.** `formatCents()`
    (`lib/format.ts`) rounds to whole euros, right for prices and budgets,
    wrong here: `paidCents / totalClicksAllTime` is routinely under a euro,
    and whole-euro rounding would show "€0" for a real, nonzero number.
    `KpiRow.tsx` gets its own `Intl.NumberFormat` at `maximumFractionDigits:
    2` rather than widening the shared formatter's precision for every
    other caller. Zero clicks shows the literal string "no clicks yet" (the
    brief's exact wording), not "€0" or "—".
  - **One fetch, one status, kept apart from the attribution table's own
    pagination.** `ResultsPage` already had `page`/`status`/`reloadKey` for
    the table; the new KPI/chart section gets its own
    `dashboardStatus`/`dashboardReloadKey` and a `Promise.all` over
    `getResultsOverview()` + `listCampaigns({ pageSize: 50 })` +
    `listAttribution({ page: 1, pageSize: 8 })`, so paging the table below
    never re-fetches the dashboard above it, and a dashboard load failure
    doesn't blank the table that loaded fine.
  - **`fixtures.ts`'s `getResultsOverview` mirrors A7's zero-fill logic
    locally**, not just its output shape: a local `STATUS_ORDER` constant
    (same seven-status lifecycle order as the API's) and `emptyClicksDays()`
    (30 UTC day buckets, oldest first, today included) — same pattern
    `fixtureNextAction` already set for "no server to ask, so the table gets
    duplicated by hand, keep in sync manually." `bookingsByStatus`/
    `paidCents`/`committedCents` are real, derived from `fixtureBookings`
    the same way `listCampaigns` already does (reuses the existing
    `COMMITTED_STATUSES` set); every click figure stays honestly zero,
    since nothing in fixtures mode ever simulates a real `/r/:slug` hit, so
    `clicksByDay` zero-filled is not a placeholder, it's the true state.
  - **Verified in the browser against the fixture client** (the real API's
    CORS is pinned to the primary dev origin, and a second one couldn't be
    stood up for this check without either editing a file outside this
    slice's scope or risking the shared dev API's own watch process, so
    fixtures were the safe path to an actual render): fresh load renders
    all four panels' empty states correctly, including "no clicks yet" and
    the pipeline's "Invite a creator from the marketplace" empty state with
    a working link; booking a creator through the real marketplace UI, in
    the same page load, moved the pipeline's Invited bar from the empty
    state to a full-width bar reading "1" and lit up Fintech Trust
    Campaign's invited (lightest-tint) segment against its €5,000 budget,
    both without a reload, confirming the dashboard reads the same
    in-memory booking state the marketplace and budget bar already do. A
    hard browser navigation (not an in-app route change) resets fixtures'
    in-memory state, as expected of a client-side stand-in with no
    database, so this check was done as one continuous session, not by
    reloading between steps. The real API's A7 aggregates were checked by
    inspection against `ResultsOverview` rather than re-run live, since A7
    itself already verified them end to end (docs/DECISIONS.md, A7 entry,
    same file) and this slice is UI over an already-proven contract.
  - `npx tsc --noEmit` on `apps/web` (via its own `tsconfig.json`) — clean,
    no errors.

- 2026-09-26 — **W6, the detail panel scrolls on its own.** The panel's
  content (header + tabs + both tabs + the booking rail) could be taller
  than the list column, and the whole page had to scroll to reach the
  booking rail — after which the shorter list column left a large empty
  gap on the left, because the flex row's height was governed by the
  taller panel. Fixed in `CreatorsListPage.tsx` + `CreatorDetailPanel.tsx`
  only, per the brief's file boundary (`apps/api`, `lib/api`, `ResultsPage`,
  dashboard components untouched).
  - **Sizing lives in `CreatorsListPage.tsx`, not the panel.** On desktop
    (`matchMedia("(min-width: 1024px)")`, tracked in state so it reacts to
    a resize crossing the breakpoint, not just read once) the panel
    wrapper gets an inline `{ top, height }`: `top` is the real top bar's
    height and `height` is `Math.min(listColumnHeight, viewportHeight -
    topBarHeight - 32)` — 32 matching the page's own `p-s8` bottom
    padding, not a separate guess. Both `listColumnHeight` and
    `topBarHeight` come from `ResizeObserver`s on the real DOM (the list
    column's own ref; the top bar found via `document.querySelector("main
    > header")`, the only header that's a direct child of `main` — AppShell
    is out of scope for this change, so its top bar has no exported height
    to read). The `Math.min` is what actually fixes the empty-space bug:
    capping the panel to the viewport alone still left it taller than a
    short list (a full viewport is usually taller than a ~12-row page), so
    the row's height stayed panel-governed. Capping to whichever is
    shorter makes the row's height list-governed whenever the list is the
    shorter one — verified in the browser: `row.getBoundingClientRect()`
    bottom exactly equals the list column's bottom, not the panel's,
    confirming there's no leftover empty space below the list.
  - **ResizeObserver gotcha, caught in verification, not assumed away**:
    the first version read `entry.contentRect.height` inside the observer
    callback, which is content-box (excludes padding and border) — the top
    bar's own height, measured this way, came back roughly half its real
    (border-box) size, right after a client-side sign-in navigation, and
    never corrected itself even though the header's real size never
    changed (nothing to trigger a second callback). `getBoundingClientRect
    ().height` (border-box) is what both the initial call and the
    `ResizeObserver` callback use now, in both observers (top bar and list
    column) — confirmed stable across a sign-out/sign-in round trip with
    six samples 300ms apart, all reading the same correct height.
  - **The panel itself** (`CreatorDetailPanel.tsx`) no longer uses the
    shared `Card` primitive for its ready-state root — `Card`'s own
    `p-s6` can't be selectively overridden per-section without relying on
    Tailwind's generated class order (no `tailwind-merge` in this
    project), so the border/radius/surface tokens are applied directly on
    a `flex h-full min-h-0 flex-col` wrapper instead. Inside: a `shrink-0`
    header (avatar, name, role line, star — unchanged content) with its
    own `border-b`, then a `min-h-0 flex-1 overflow-y-auto` region holding
    the tabs, tab content, and the booking rail. `h-full` on the root only
    resolves correctly because the wrapping div in `CreatorsListPage.tsx`
    sets an explicit `height` (not `max-height` — a percentage height
    can't resolve against an auto-height ancestor even with `max-height`
    set). Scrollbar styling is `scrollbar-width: thin` +
    `scrollbar-color: var(--border) transparent` (Firefox) via Tailwind
    arbitrary properties, applied in the component itself — no change to
    `index.css`, which is outside this session's file boundary; Chromium
    keeps its default scrollbar, per the brief's "or default."
  - **Reset to top on selection**: the scroll region's ref calls
    `scrollTo({ top: 0 })` inside the same `useEffect` that already resets
    `tab` to `"overview"` on `creatorId` change — one effect, not two.
  - **Narrow screens**: the desktop check gates the inline style entirely;
    below 1024px the wrapper has no `top`/`height`, `position` reads
    `static` (confirmed in the browser), and the panel stacks below the
    list exactly as before this change.
  - **Verified in the browser** at 1440×900 and 1280×720 (real DOM
    measurements, not just visual): panel height matched
    `viewportHeight - topBarHeight - 32` in both sizes; scrolling the
    panel's own region to its `scrollHeight` moved `panelScrollTop` to the
    bottom while `window.scrollY` stayed at 0 (page didn't move) and the
    header text stayed visible throughout; selecting a different row reset
    `panelScrollTop` to 0 and swapped the header's name. At 914px width
    (the pane's floor for a 390px emulation request) the wrapper's
    `position` was `static` with no inline `top`/`height`, confirming the
    narrow-screen path is untouched.
  - **`npm run shots`**: ran clean, all ten shots regenerated
    (`marketplace.png`/`marketplace-detail-panel.png` show the panel
    correctly bounded beside the list, no empty space below the list
    column). Same six pre-existing `randomuser.me` `ERR_FAILED` lines as
    every prior run in this session — not a regression.
  - `npx tsc --noEmit -p apps/web/tsconfig.json` — clean, no errors.

- 2026-09-26 — **W6 addendum: panel floor.** The cap alone (whichever is
  shorter — viewport-below-top-bar or the list column) had no lower bound,
  so a heavily filtered list (one or two rows) shrank the panel to match,
  making the booking rail unusably cramped. Added a 560px floor:
  `panelHeight` is now `Math.max(Math.min(panelAvailableHeight, 560),
  <the existing capped value>)` — never shorter than 560px unless the
  viewport itself has less than 560px to give (a very short screen still
  wins, so the panel never overflows). File: `CreatorsListPage.tsx`.

- 2026-09-26 — **W7, entry page redesign.** The brief: the page read as the
  old naano clone with a new colour, not a product someone designed — a left
  column of text, two plain cards, and a flat colour block with one sentence.
  Rebuilt as `EntryPage.tsx` plus three new files under
  `components/entry/` (`RolePanel.tsx`, `BookingStepsStrip.tsx`,
  `LiveCreatorsStrip.tsx`), token-only, Fraunces headings / IBM Plex Sans UI
  per `index.css`'s existing type layer (already wired for both faces before
  this session — DESIGN.md's own "one family" line is stale against that;
  not fixed here, out of this slice's scope).
  - **RolePanel**: the whole panel is a real `<button>` (native disabled/
    focus behaviour, and the existing `enter()`/`pending`/`failed` sign-in
    logic is untouched) — a nested `<button>` for the CTA isn't valid HTML,
    so the CTA is a `<span>` sharing the same classes as `ui/Button`'s
    primary variant. Bullets use `list-disc` + `marker:text-primary` rather
    than a hand-built dot (no arbitrary pixel sizing needed).
  - **BookingStepsStrip**: five real steps (Invite/Accept/Draft/Publish/
    Paid) — the one place DESIGN.md's anti-slop rule allows numbered
    markers, since it's a genuine sequence. Connected visually with a
    hairline divider between columns (row on `sm:` and up, stacked with a
    top divider below it) rather than an arrow or chevron between steps —
    "arrow appended to button text" is barred but this isn't a button, and
    an arrow between steps read closer to the barred pattern than a plain
    line does, so line it is.
  - **LiveCreatorsStrip**: real `GET /creators?page=1&pageSize=5`
    (unauthenticated — the route has no guard, confirmed against
    `creators.controller.ts`), rendered via the existing `ui/Avatar`
    (photo-over-initials) + `verticalLabel`/`formatCompactNumber` from
    `lib/format.ts`. `creators` state starts `null` (nothing rendered while
    in flight) and both the empty-result and error paths resolve it to `[]`,
    which renders `null` — the strip hides silently rather than showing an
    error on a page whose only job is getting someone signed in, per the ask.
    Caught one anti-slop rule that would have been an easy miss: "no meta
    strings joined with middle dots" (the same rule that killed the old
    modal's "AI · Marketing · LinkedIn creator" role line, per the
    "Session: web (own-product redesign)" heading above) — grepped the repo
    for `·` first (zero hits, confirming the rule already holds everywhere
    else) and joined vertical + follower count with a comma instead:
    "Fintech, 58K followers".
  - **Verified in the browser** against the real API (`web` dev server +
    local API on `:3000`): both sign-ins walked end to end (brand into the
    marketplace, creator onto their own profile), the live strip rendered 5
    real creators (`GET /creators?page=1&pageSize=5` → 200, names/verticals/
    follower counts matched the response), the two role panels sat side by
    side at 1440px width (confirmed via `getBoundingClientRect` — the
    browser pane's screenshot only captures ~800px at a time, so layout was
    checked by measurement, not by eye, at that width) and stacked to one
    column at 390px with the steps strip and live strip both re-flowing
    cleanly. `npx tsc -b apps/web/tsconfig.json` — clean, no errors.

## Session: web, round 3

- 2026-09-26 — W8, `CreatorHomePage` rebuilt from a plain profile card into a
  real Overview (docs/RECON-CREATOR.md's "Overview" section, "Problems worth
  fixing" #4 — naano's own first run is four zeros above the fold). Only
  `apps/web/src/routes/CreatorHomePage.tsx` touched; no new API method, all
  four data sources (`getCreator`, `getEarnings`, `getActionCount`,
  `listBookingsReceived`) already existed and are fetched in one
  `Promise.all`.
  - **Every tile carries a caption, never a bare number.** Earned:
    "N paid, €X average" or "No paid collaborations yet" at zero. In transit:
    "Arrives in 1 to 7 days" or "Nothing in transit right now" at zero. Needs
    you: "Waiting on your next move" or "Nothing needs you right now" at
    zero. Your price: "Single post, CPM €X" — always populated, since the
    API's own price floor (5,000 cents) means this can never legitimately be
    zero. No middle dots anywhere in this copy — grepped for `·` first
    (still zero hits repo-wide, per the "Session: web (own-product redesign)"
    note above) and used a comma instead, same call as `LiveCreatorsStrip`.
  - **"Needs you" panel derivation.** `listBookingsReceived({ pageSize: 20
    })`, filtered to `nextAction.consequence !== ""` (the same test
    `CollaborationCard`/`CreatorCollaborationsPage` already use to mean "the
    creator's move, not the brand's"), sliced to 3. Not a separate endpoint —
    the API's A6 slice already orders actionable rows first, so a 20-row page
    reliably surfaces every actionable row a creator would realistically have
    without pagination. Each row links to `/app/collaborations` (no inline
    accept/decline here — that stays the one place with the real controls)
    and shows brand, campaign, the next-action label, and net amount.
  - **Layout.** `flex-col lg:flex-row`, left column (tiles + Needs you +
    Earnings chart) `flex-1 min-w-0`, the creator card `lg:w-[440px]` — same
    beside/below breakpoint convention the marketplace detail panel already
    uses (the "Piece 2" entry under "Session: web (own-product redesign)"
    above). Inside the now-440px-wide card, the metrics grid and audience
    snapshot lost their `sm:`/`lg:` column-count bumps: those key off
    viewport width, not container width, and would have squeezed 3–5 columns
    into a fixed 440px box on any wide screen. Fixed at 2 columns (metrics)
    and 1 column (audience) instead.
  - **Edit card unchanged in substance**, only re-parented: same
    `EditCardForm`, same validation, same `onSaved` callback — now merges
    into a `HomeData` object (`{ detail, earnings, actionCount, needsYou }`)
    instead of a bare `detail` state, since the page now holds four fetched
    pieces, not one.
  - **Verified against the running local API** (`web` on :5173, `api` on
    :3000) signed in as the demo creator (Clara Keller): initial state showed
    all-zero actionable tiles and both real empty states ("Nothing needs you
    right now" in the greeting, the tile, and the panel). Used the existing
    dev-only `POST /dev/bookings/ensure-invited` to give her one genuine
    INVITED booking, then reloaded — the greeting read "1 collaboration needs
    you.", the Needs you tile and panel both showed it (Vertice Analytics /
    Q4 RevOps Awareness / "Accept or decline this invitation." / €789), and
    the Earned/In transit figures (€838 / €3,359) matched the Earnings page
    exactly while the Needs-you count matched the rail badge and the
    Collaborations page's single actionable row. Edit card re-verified end to
    end: changed the headline, saved, confirmed the new value persisted
    through a reload, then reverted it. Checked 1440px (two-column, beside)
    and 375px (single column, card below) — no horizontal scroll, tiles
    reflow 2-up on mobile. No console errors. `npx tsc -b
    apps/web/tsconfig.json` — clean.
