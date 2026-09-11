# MAP.md

Read this instead of listing or globbing the repo. Keep it current: if you add a
directory that another session would need to find, add the line here in the same
change.

```
docker-compose.yml        Postgres for local dev (not needed if you already run
                           Postgres elsewhere, as this session does)
.env.example               Root-level template. Real .env files live in
                           apps/api/ and apps/web/, gitignored.
.gitattributes             `* text=auto eol=lf` (Session B) — stops CRLF churn.
.dockerignore               Session B. Shared by both service images (context
                           is the repo root for both); excludes node_modules,
                           dist, and every .env*.
scripts/
  smoke.mjs                 Session B. `node scripts/smoke.mjs <api-base-url>`
                           — pre-submission "is it still up" check (health,
                           40 creators, seeded-account login, dev-guard 404).
                           No deps, fetch only. Seeded emails/password read
                           from apps/api/prisma/seed.ts, not hardcoded blind.
apps/
  api/                    NestJS
    Dockerfile               Session B. Build context is the repo root. Single
                           build stage (install after the real source is
                           copied in — see docs/DECISIONS.md Session B for
                           why) -> pruned runtime layer. No devDependencies at
                           runtime, so the seed cannot run in this image.
    railway.json             Session B. Builder DOCKERFILE, healthcheck
                           `/health`. Railway's Builder setting (dashboard)
                           has to say Dockerfile too, or Railpack silently
                           wins — see DECISIONS.md.
    prisma/
      schema.prisma       Source of truth for the data model. Reflects the
                           docs/RECON.md §10 delta (medianViews, postCostCents +
                           bundle5PriceCents, network, Icp, AudienceSegment,
                           CreatorPost, Booking.initiatedBy, observedEngagerCount,
                           postsAnalyzed). Campaign.targetVertical drives ICP fit.
                           ShortlistItem = a creator saved to a campaign
                           (unique per campaign+creator). CPM is never a column.
      seed.ts             Realistic seed data. Figures + volume/calibration
                           targets come from docs/RECON.md §10-12. Sets an
                           explicit creator id + a randomuser.me photo avatarUrl
                           on every creator (gender keyed on first name), 44
                           distinct surnames indexed directly, and 13
                           ShortlistItem rows. LinkedIn only — no X creators or
                           posts. Post cost = cpm * medianViews / 1000, no
                           clamp; nudged off round-25s and collisions
                           (usedPostCosts) so all 40 are distinct. Campaign
                           destinationUrls are example.com paths (resolves) —
                           not example.com subdomains (don't resolve).
      fix-destination-urls.ts  One-off, idempotent data fix (not run by
                           deploy or by seed.ts) for a database that was
                           already seeded before the example.com fix above:
                           updates Campaign + TrackedLink destinationUrl by
                           exact old->new URL pair. Run once by hand via
                           `railway run`, same pattern as prisma:seed — see
                           docs/DECISIONS.md for the exact command and why a
                           reseed can't do this (TrackedLink snapshots its
                           URL at accept time and seed.ts has no cleanup step,
                           so it isn't safe to rerun against existing data).
    src/
      main.ts
      app.module.ts
      prisma/             PrismaService, global module
      common/             Cross-cutting bits: non-production.guard.ts (404s a
                           route when NODE_ENV=production) and
                           dto/pagination-query.dto.ts (page/pageSize, the base
                           every list DTO extends).
      auth/               JWT strategy/guards/role decorator, POST /auth/login,
                           and GET /auth/me (JWT-guarded — userId, email, role,
                           companyId, creatorProfileId, displayName). Backs the
                           `/` entry page's two real sign-ins. GET
                           /auth/demo-creator (public, no guard) resolves which
                           seeded creator "Continue as a creator" signs into:
                           whoever the demo brand (Ledgerly) most recently
                           booked, else the first creator the seed created —
                           see DECISIONS.md for why EntryPage can no longer
                           hardcode a creator email.
      creators/           GET /creators (paginated) with filters (vertical x N,
                           country, q free-text, price range, max CPM, min median
                           views, min/max followers, min engagement %, posted-
                           within-days) and four sorts (best_match default,
                           price_asc, followers_desc, engagement_desc). Optional
                           campaignId sets the ranking context; rows return as
                           MarketplaceCreator (CreatorProfile + sectorFitPct =
                           creator vertical vs campaign target, 0..100).
                           GET /creators/:id returns profile + audienceSegments
                           + posts (CreatorProfileDetail). Filter/sort DTO in
                           dto/list-creators.dto.ts. CPM from @naano/shared
                           cpm.ts, never stored. ranking.ts: best_match is
                           fit-band-first then a rank-normalised performance
                           blend within the band (CPM .5 / views .3 / eng .2);
                           takes an optional fitById map. audience-fit.ts holds
                           the swappable sector-fit rule and is now called by
                           list() (via scoreAudienceFit) and by
                           CreatorsService.audienceFitScore(). mappers.ts owns
                           toCreatorProfile / toMarketplaceCreator (shared with
                           shortlist/). Filter/sort/page in memory over the
                           ~40-row catalogue after one DB where. Imports
                           CampaignsModule for the active-campaign lookup.
      campaigns/          CampaignsService.getActive() = the campaign the
                           marketplace ranks for and the shortlist keys to (most
                           recent LIVE, else most recent). GET /campaigns/active
                           exposes it. Full CRUD + brief land with 3.1.
                           Exports CampaignsService.
      shortlist/         Campaign-scoped shortlist. GET|POST
                           /campaigns/:campaignId/shortlist (POST idempotent),
                           DELETE /.../:creatorProfileId (no-op if absent).
                           Returns MarketplaceCreator rows with ICP fit vs the
                           campaign. The marketplace Shortlist tab and the
                           campaign Shortlist tab (3.5) both read GET here.
      bookings/           Real, guarded routes. POST /bookings (COMPANY,
                           from the signed-in company's active campaign via
                           CampaignsService.getActiveForCompany — price
                           derived server-side from the creator's
                           postCostCents/bundle5PriceCents, 409 on a
                           duplicate non-DECLINED booking for the same
                           creator+campaign). GET /bookings/received
                           (CREATOR, own profile only, enriched with
                           campaign/company name). GET /bookings/sent
                           (COMPANY, own company, optional ?campaignId and
                           ?status — 4.2's Collaborations table; @IsIn-
                           validated against BookingStatus) returns
                           BookingSent rows (creatorDisplayName, campaignName,
                           package), not bare Booking. PATCH
                           /bookings/:id/status (CREATOR,
                           INVITED->ACCEPTED|DECLINED — accepting mints the
                           booking's TrackedLink in the same $transaction,
                           destinationUrl from the campaign, never the
                           client). First feature endpoints behind
                           JwtAuthGuard+RolesGuard+@Roles; ownership resolved
                           server-side from the JWT subject, never from a
                           client-supplied id. Every booking read selects
                           trackedLink: { slug, _count: { clickEvents } }
                           (TRACKED_LINK_SELECT) so the wire Booking always
                           carries trackedLinkSlug/clickCount (null until a
                           link exists). mappers.ts: toBooking/
                           toBookingReceived/toBookingSent — the last derives
                           `package` (not a stored column) by comparing
                           agreedPriceCents to the creator's own
                           bundle5PriceCents; see docs/DECISIONS.md for why
                           that's sound and why `deliverable` free text isn't
                           used instead. dev-bookings.controller.ts adds
                           a dev-only POST /dev/bookings/ensure-invited
                           (NonProductionGuard) that guarantees a creator has
                           one INVITED booking, for the screenshot suite —
                           see docs/PLAN.md's 2026-09-11 Discovered entry for
                           why it exists (seed can leave a creator with no
                           campaign left to be freshly invited into).
      tracking/           GET /r/:slug -> record ClickEvent -> 302. The spine.
                           Fully working, verified end to end. slug.ts:
                           generateTrackedLinkSlug() (9 random bytes,
                           base64url), used by bookings.service.ts on accept.
                           dev-tracked-links.controller.ts adds a dev-only
                           GET /dev/tracked-links (slug/campaign/creator/dest),
                           guarded off in production.
      analytics/          Empty, wired stub module. No routes yet.
  web/                    React + Vite
    Dockerfile               Session B. Build context is the repo root. Takes
                           VITE_API_URL / VITE_API_MODE as Docker build ARGs
                           and fails the build if VITE_API_URL is empty — Vite
                           inlines both at BUILD time (see docs/DECISIONS.md
                           Session B: changing the API URL means rebuilding
                           this image, not restarting it). Runner is
                           caddy:2-alpine serving the static dist/.
    Caddyfile                Session B. Site address `:{$PORT}` (the
                           Railway-injected port, never hardcoded) +
                           `try_files {path} /index.html` for SPA routing.
    railway.json             Session B. Builder DOCKERFILE, healthcheck `/`.
    scripts/
      shot.mjs            Playwright screenshot tool for one route. `npm run shot
                           --workspace=apps/web -- <route> [name]` -> 1440px PNG
                           in apps/web/.screenshots/ (gitignored). Dev server
                           must be up. From Git-Bash prefix MSYS_NO_PATHCONV=1.
      shots.mjs            `npm run shots --workspace=apps/web` — the full
                           marketplace suite (grid, both modal tabs, booking
                           rail, collaborations, creator home + bookings,
                           error state). Wipes
                           .screenshots/ first, prints mtimes. Run it to
                           finish any UI change. Before the creator-home
                           shots it calls the dev-only POST
                           /dev/bookings/ensure-invited directly (no browser)
                           so creator-booking-requests.png always has an
                           INVITED row with Accept/Decline visible — see
                           docs/PLAN.md's 2026-09-11 Discovered entry for why
                           a normal booking-creation UI flow can't guarantee
                           that. Still does not drive a real booking
                           creation through the UI (that mutation is not
                           idempotent against the persistent local dev DB —
                           see docs/PLAN.md's 2026-09-10 Discovered entry);
                           the rail's idle state is covered by
                           modal-rail-bundle instead.
    tailwind.config.js    Maps Tailwind utilities onto the CSS custom properties
                           in src/index.css via var(). No raw hex/px in configs
                           or components.
    vite.config.ts        Aliases @naano/shared -> its src/index.ts (source, not
                           dist): Rollup can't follow the shared package's CJS
                           re-exports for runtime named imports (cpmCents).
    src/
      index.css           The design token layer: colour, two radii, one overlay
                           shadow, type ramp, Inter stack -- defined once here
                           per docs/DESIGN.md. Single source of truth.
      lib/
        api/              ALL http lives here. Two impls: http + fixtures,
                           selected by VITE_API_MODE. client.ts is the interface:
                           login, getMe, listCreators, getCreator,
                           getActiveCampaign, listShortlist / addToShortlist /
                           removeFromShortlist, createBooking /
                           listBookingsReceived / listBookingsSent /
                           updateBookingStatus. http.ts maps every list param,
                           including the vertical/country/follower-range
                           filters FilterPanel (2.5) surfaces, and exports
                           setApiToken (Bearer header for authed calls);
                           request() throws errors.ts's ApiError (carries the
                           HTTP status) so callers can special-case a status
                           (e.g. 409 already-booked) instead of one generic
                           failure message. fixtures.ts mirrors all of it —
                           in-memory shortlist + bookings, plus the same
                           vertical/country/follower-range filtering as
                           http.ts (kept in sync since 2.5) — FIXTURE_ME is
                           always the brand, so the creator-side booking
                           methods have no real fixture context yet.
                           listBookingsSent (4.2) returns BookingSent
                           (creatorDisplayName/campaignName/package added)
                           and takes an optional status, both wired in
                           client.ts/http.ts/fixtures.ts — see
                           docs/DECISIONS.md for the package-derivation
                           reasoning (real API) vs. the plain pass-through
                           (fixtures, which already has the package on hand
                           from the request).
        stores/           Zustand stores, one per domain. authStore.ts:
                           {token, me}, persist -> localStorage naano.auth;
                           signIn does a real login + /me, signOut clears it.
                           creatorsStore.ts: grid page/sort/q/tab state, plus
                           filter state (vertical[], country, minFollowers,
                           maxFollowers) from 2.5 — each setter resets page
                           to 1 like the others. shortlistStore.ts:
                           {campaignId, ids, status} — hydrates from the API,
                           optimistic writes, no localStorage.
                           bookingsStore.ts: {campaignId, byCreatorId,
                           status} — byCreatorId values are CreatorBookingInfo
                           ({status, clickCount}), same hydrate pattern as
                           shortlistStore, maps creator -> booking info for
                           the active campaign so the marketplace card can
                           show "already booked" (and, once accepted, its
                           click count) without a new screen. A creator can
                           have more than one booking against the active
                           campaign (e.g. declined, then rebooked) —
                           hydrate() keeps the most recent one
                           (listBookingsSent is createdAt desc; first seen
                           per creator wins), not whichever sorts last, so
                           the card always reflects what the brand most
                           recently did. See docs/DECISIONS.md.
                           recordBooking() takes the full Booking and
                           updates the map immediately on a successful
                           create. uiStore.ts: unused pattern example.
        countries.ts      Country code -> display name for the 15 codes
                           apps/api/prisma/seed.ts seeds. No distinct-countries
                           endpoint exists, so this is read off the seed, not
                           derived from the API.
        format.ts         Money/number/percent + verticalLabel helpers.
                           Render-boundary only; formatCpm uses @naano/shared.
        bookingStatus.ts  BookingStatus -> StatusPill tone/label, shared by
                           CreatorCard, BookingRail's confirmation state, and
                           CreatorHomePage's bookings list.
        trackedLink.ts    trackedLinkUrl(slug) -> the public GET /r/:slug URL
                           (VITE_API_URL + /r/ + slug), for display and copy.
      routes/             EntryPage (public, "/") — two real one-click sign-ins
                           (brand/creator) against seeded accounts, then routes
                           into /app. "Continue as a creator" first calls GET
                           /auth/demo-creator to resolve which creator email to
                           sign in as (see DECISIONS.md) rather than a
                           hardcoded one. AppShell = the 72px icon rail (DESIGN
                           §layout, brand-only — see below) + a top bar
                           (signed-in identity, Sign out); redirects
                           signed-out /app to /. App.tsx's AppIndex picks the
                           surface by role: CreatorsListPage (brand) or
                           CreatorHomePage (creator — their own profile,
                           "this is how brands see you", from GET /creators/:id,
                           plus a "Your bookings" section reading
                           GET /bookings/received with real Accept/Decline and,
                           per booking with a trackedLinkSlug, a copy-to-
                           clipboard tracked-link row (TrackedLinkRow)).
                           CollaborationsPage (new, 4.2) is brand-only at
                           /app/collaborations (App.tsx's RequireBrand
                           redirects a creator who reaches the URL back to
                           /app, since the rail never shows it to them) —
                           every GET /bookings/sent row via
                           CollaborationsTable, a real ?status= filter
                           (dropdown, not RECON's tabs-with-counts — see
                           DECISIONS.md), and CreatorsPagination reused
                           unmodified for the pager. The rail (AppShell.tsx)
                           is now role-aware and every icon routes somewhere
                           real: brand gets Marketplace (/app) +
                           Collaborations (/app/collaborations), a creator
                           gets no rail at all rather than a single
                           permanently-active icon — see DECISIONS.md.
      components/
        ui/               Token-only primitives: Button, Card, Input, Select,
                           Checkbox, Badge, StatusPill, Table (+ THead/TBody/TR/
                           TH/TD), Tabs, Modal, SegmentedBar, Disclosure
                           (styled <details> + chevron, controlled), Avatar
                           (initials always render underneath; the <img> paints
                           over them once loaded and is removed on error — no
                           empty circle while a slow photo loads). None hardcode
                           a colour, radius or spacing value.
        marketplace/      MarketplaceHeader (title/explainer, All+Shortlist tabs
                           with counts, search, sort-by, section header — "Best
                           match first" / "All N creators, ordered by…" (singular:
                           "1 creator, ordered by…"), true at any catalogue size).
                           FilterPanel (2.5, partial): industry searchable
                           multi-select, country dropdown, follower min/max,
                           active-filter chips + Clear all. No price range or
                           performance filters yet (2.5 remainder / 2.6).
                           CreatorCard (checkbox, network badge, sector-fit
                           badge, booking StatusPill + "N clicks" once a
                           booking exists for the active campaign and has a
                           tracked link, star, Book, 4-metric strip, View
                           profile). CreatorGrid (3/2/1 cols, threads
                           bookingById — Record<id, CreatorBookingInfo> —
                           through). CreatorsPagination (Prev/Next + range).
                           CreatorProfileModal = two-column shell (tabbed
                           content + persistent BookingRail aside), from
                           GET /creators/:id. modal/ has OverviewTab (its post
                           card is paged — "N of 5", prev/next, resets to
                           post 1 per creator; 2.12 folded in here rather
                           than a third tab, see DECISIONS.md), AudienceTab,
                           BookingRail (real submit: package radio +
                           deliverable input -> POST /bookings; renders one of
                           the form / a booked confirmation / an already-booked
                           notice / a retryable error, see bookingStatus.ts and
                           lib/api/errors.ts), ReachSparkline (inline-SVG),
                           audienceSegments.ts (dimension-filter helper).
                           Two tabs only (Overview, Audience) — no Content
                           tab. icons.tsx (NetworkBadge, StarIcon).
        campaign/         CollaborationsTable (new, 4.2): Creator, Campaign,
                           Package, Agreed price, Status, Tracked link (copy
                           button + click count, gated on trackedLinkSlug
                           existing rather than on status === ACCEPTED, since
                           seed can place a booking straight at
                           SCHEDULED/LIVE/PAID with a link already minted).
                           Brief form, campaign list, status pills still land
                           with the rest of the campaign flow.
        dashboard/        Empty. Metric tiles, charts land with the dashboard.
packages/
  shared/                 Wire-safe types (enums.ts, entities.ts, api.ts) hand-kept
                           in sync with prisma/schema.prisma. Imported by both apps.
                           api.ts adds MarketplaceCreator + campaignId/q on
                           ListCreatorsParams, CampaignSummary, AddToShortlistBody,
                           BookingSent (GET /bookings/sent — Booking +
                           creatorDisplayName/campaignName/package, 4.2).
                           cpm.ts: the one CPM formula
                           (postCostCents / medianViews * 1000), used by API and
                           web. index.ts NAMES the cpm re-export (not export *) so
                           bundlers see it. Run `npm run build:shared` after
                           editing (the API reads dist; web reads src via alias).
docs/
  PRODUCT.md              Domain reference (superseded by RECON.md on conflict)
  RECON.md                Direct walkthrough of the live naano brand app. Wins
                           over PRODUCT.md. §10-12 drive the schema/seed/plan.
  DESIGN.md               Hard visual constraints. Read before any component.
  PLAN.md                 Sliced build checklist + session handoff. Read at the
                           start of every session, tick at the end.
  DECISIONS.md            Architecture + running log
  MAP.md                  This file
  BRIEF.md                The assignment text once opened. Authoritative.
```

## Where to make common changes

- New marketplace filter → `apps/api/src/creators/` + `components/marketplace/`
- New dashboard metric → `apps/api/src/analytics/` then a tile in
  `components/dashboard/`
- Booking status change → `apps/api/src/bookings/bookings.service.ts`
  (`updateStatus`, INVITED-only guard), and `lib/bookingStatus.ts` for the
  pill tone/label
- Shortlist behaviour → `apps/api/src/shortlist/` + `lib/stores/shortlistStore.ts`
- "Active campaign" logic → `apps/api/src/campaigns/campaigns.service.ts`
- Sign-in / session logic → `apps/api/src/auth/` + `lib/stores/authStore.ts`
- Anything touching the data model → `prisma/schema.prisma` first, then
  `packages/shared`, then consumers
