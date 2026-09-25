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
      demo-actions.ts     Demo-data top-up for A1's five new lifecycle
                           statuses (dry-run by default, --apply, refuses
                           localhost without --local — same shape as
                           free-creators.ts). Idempotently guarantees the
                           demo creator has a booking in each of INVITED/
                           ACCEPTED/SCHEDULED and the demo brand (Ledgerly)
                           has one, any creator, in each of DRAFT_READY/LIVE
                           — creating fresh bookings in free campaigns where
                           possible, converting an existing non-declined
                           booking in place only when none are free.
                           ensureChildRows keeps every row internally
                           consistent with its status (TrackedLink from
                           ACCEPTED on, Post from DRAFT_READY on,
                           linkedinUrl/publishedAt from LIVE on, Payout at
                           PAID) — see docs/DECISIONS.md for the local run.
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
                           + posts (CreatorProfileDetail). PATCH /creators/me
                           (CREATOR, A4, round 2) edits the signed-in creator's
                           own headline/postCostCents/bundle5PriceCents —
                           dto/update-my-card.dto.ts validates the per-field
                           shape (headline 1..160 trimmed, both prices integer
                           5,000..2,250,000 cents), CreatorsService.updateMyCard
                           adds "at least one field" and the
                           bundle5PriceCents-vs-postCostCents cross-check
                           (evaluated after merging onto the stored row),
                           returns CreatorProfileDetail. Declared before ":id"
                           on the controller. Never touches Booking —
                           agreedPriceCents is fixed at booking time, only
                           future bookings see a new price. Filter/sort DTO in
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
                           `q` matches displayName, headline, and vertical
                           (verticalsMatching(): case-insensitive substring
                           against the enum value, `_` read as a space) —
                           see docs/DECISIONS.md for the before/after counts.
      campaigns/          CampaignsService.getActive() = the campaign the
                           marketplace ranks for and the shortlist keys to (most
                           recent LIVE, else most recent) — global, not scoped
                           to a company (see docs/DECISIONS.md's A2 entry for
                           why that's noted, not fixed). GET /campaigns/active
                           exposes it. GET /campaigns (COMPANY, A2, round 2):
                           the signed-in company's own campaigns,
                           Paginated<CampaignOverview>, LIVE then DRAFT then
                           COMPLETED, newest first within each — fetched then
                           sorted in memory (same pattern as creators'
                           best_match) since the wanted order isn't the enum's
                           declaration order. Money (pending/committed/paid/
                           bookingsCount) comes from one
                           prisma.booking.groupBy({by:["campaignId","status"]})
                           over the page's campaign ids, folded up in memory —
                           never a query per campaign. getOwnedByCompanyOrThrow
                           (new): 404s (never 403) a campaignId that doesn't
                           exist or belongs to another company — used by
                           POST /bookings' optional campaignId. Full CRUD +
                           brief land with 3.1. Exports CampaignsService.
      shortlist/         Campaign-scoped shortlist. GET|POST
                           /campaigns/:campaignId/shortlist (POST idempotent),
                           DELETE /.../:creatorProfileId (no-op if absent).
                           Returns MarketplaceCreator rows with ICP fit vs the
                           campaign. The marketplace Shortlist tab and the
                           campaign Shortlist tab (3.5) both read GET here.
      bookings/           Real, guarded routes. POST /bookings (COMPANY,
                           from the signed-in company's active campaign via
                           CampaignsService.getActiveForCompany, or an
                           explicit optional campaignId (A2, round 2) via
                           CampaignsService.getOwnedByCompanyOrThrow — 404 if
                           not owned, 409 if COMPLETED, only checked when
                           campaignId is actually passed so the omitted case
                           is unchanged — price derived server-side from the
                           creator's postCostCents/bundle5PriceCents, 409 on a
                           duplicate non-DECLINED booking for the same
                           creator+campaign; going over budget is never
                           checked, deliberately). GET /bookings/received
                           (CREATOR, own profile only) returns
                           CreatorCollaboration rows — BookingReceived plus a
                           derived nextAction and netCents, per
                           docs/RECON-CREATOR.md's Collaborations screen.
                           GET /bookings/earnings (CREATOR, own profile,
                           no pagination — a summary) returns CreatorEarnings:
                           totalEarnedCents/paidCollaborationsCount/
                           averageCents from PAID bookings, inTransitCents
                           from ACCEPTED..LIVE, six-month zero-filled
                           `monthly` keyed on Payout.paidAt (falls back to
                           Booking.createdAt, Booking has no updatedAt).
                           next-action.ts: nextActionFor(status, viewer,
                           hasDraft) — pure, no Prisma, both roles' full
                           lifecycle copy (respond/submit_draft/publish/
                           review_draft/mark_paid/await_brand/await_creator/
                           none); `hasDraft` (a Post already exists) tells a
                           first ACCEPTED submission from a resubmit after
                           request-changes apart. transitions.ts (new): a
                           pure action->{role,from,to} table for the five
                           lifecycle actions below (accept/decline predate
                           this and stay as literals in updateStatus);
                           wrongStateMessage(action, current) builds the 409
                           sentence from it. money.ts: netCents
                           (agreedPriceCents), the one COMMISSION_PCT
                           computation both /received and /earnings call, so
                           the two can't drift. Five lifecycle endpoints, all
                           404-on-not-owned (never 403) same as updateStatus,
                           409 via transitions.ts on the wrong status: POST
                           /bookings/:id/draft (CREATOR, ACCEPTED->
                           DRAFT_READY, upserts Post.content — a resubmit
                           overwrites), /publish (CREATOR, SCHEDULED->LIVE,
                           sets Post.linkedinUrl/publishedAt, postUrl
                           validated by MarkPublishedDto's IsPostUrlConstraint
                           — https + linkedin.com/www.linkedin.com/x.com/
                           twitter.com only), /approve (COMPANY,
                           DRAFT_READY->SCHEDULED), /request-changes
                           (COMPANY, DRAFT_READY->ACCEPTED), /mark-paid
                           (COMPANY, LIVE->PAID, upserts Payout with
                           amountCents: agreedPriceCents — matches how
                           seed.ts writes it, checked not assumed). GET
                           /bookings/sent (COMPANY, own company, optional
                           ?campaignId and ?status — 4.2's Collaborations
                           table; @IsIn-validated against BookingStatus) now
                           returns Paginated<BrandCollaboration> — BookingSent
                           plus nextAction (viewer "COMPANY") and the
                           creator's draftContent/postUrl, the brand-side
                           mirror of listReceived's CreatorCollaboration.
                           PATCH /bookings/:id/status (CREATOR,
                           INVITED->ACCEPTED|DECLINED — accepting mints the
                           booking's TrackedLink in the same $transaction,
                           destinationUrl from the campaign, never the
                           client) is unchanged by A1, per the ask. All nine
                           routes behind JwtAuthGuard+RolesGuard+@Roles;
                           ownership resolved server-side from the JWT
                           subject, never from a client-supplied id. Every
                           booking read selects trackedLink: { slug, _count:
                           { clickEvents } } (TRACKED_LINK_SELECT) so the
                           wire Booking always carries trackedLinkSlug/
                           clickCount (null until a link exists). mappers.ts:
                           toBooking/toBookingReceived/toBookingSent/
                           toCreatorCollaboration/toBrandCollaboration (new) —
                           toBookingSent derives `package` (not a stored
                           column) by comparing agreedPriceCents to the
                           creator's own bundle5PriceCents; see
                           docs/DECISIONS.md for why that's sound and why
                           `deliverable` free text isn't used instead.
                           dev-bookings.controller.ts adds a dev-only POST
                           /dev/bookings/ensure-invited (NonProductionGuard)
                           that guarantees a creator has one INVITED booking,
                           for the screenshot suite — see docs/PLAN.md's
                           2026-09-11 Discovered entry for why it exists
                           (seed can leave a creator with no campaign left to
                           be freshly invited into).
      tracking/           GET /r/:slug -> record ClickEvent -> 302. The spine.
                           Fully working, verified end to end. slug.ts:
                           generateTrackedLinkSlug() (9 random bytes,
                           base64url), used by bookings.service.ts on accept.
                           dev-tracked-links.controller.ts adds a dev-only
                           GET /dev/tracked-links (slug/campaign/creator/dest),
                           guarded off in production.
      analytics/          GET /analytics/attribution (COMPANY-only, 5.4):
                           clicks per creator for the signed-in brand, across
                           every campaign. Aggregated in memory (bounded by
                           how many distinct creators the brand has accepted
                           bookings with) — booking.findMany filtered to
                           trackedLink: { isNot: null } (accepted-only,
                           excludes invited/declined) joined to two
                           clickEvent.groupBy calls (count, max createdAt) by
                           trackedLinkId, folded up to creator level, sorted
                           totalClicks desc then creatorDisplayName asc.
                           Returns AttributionResponse (Paginated<
                           AttributionRow> + hasAnyClicks, computed over the
                           full result set so a later page can't read as
                           empty). No campaignId/date-range param — see
                           docs/DECISIONS.md for why and for the
                           ClickEvent.isLead investigation that killed a
                           planned "qualified clicks" column in favour of
                           lastClickAt.
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
                           updateBookingStatus, listAttribution (5.4,
                           brand-only). http.ts maps every list param,
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
                           CreatorComparisonList, BookingRail's confirmation
                           state, and CreatorHomePage's bookings list.
        trackedLink.ts    trackedLinkUrl(slug) -> the public GET /r/:slug URL
                           (VITE_API_URL + /r/ + slug), for display and copy.
      routes/             ResultsPage (new, 5.4, brand-only at /app/results,
                           RequireBrand-guarded like Collaborations) — fetches
                           GET /analytics/attribution on every mount (no store
                           cache, so a fresh click shows on next visit), one
                           AttributionTable, two distinct empty states (no
                           accepted bookings vs. bookings-but-no-clicks-yet).
                           EntryPage (public, "/") — two real one-click sign-ins
                           (brand/creator) against seeded accounts, then routes
                           into /app. "Continue as a creator" first calls GET
                           /auth/demo-creator to resolve which creator email to
                           sign in as (see DECISIONS.md) rather than a
                           hardcoded one. AppShell = the 72px icon rail (DESIGN
                           §layout) + a top bar (signed-in identity, Sign out);
                           redirects signed-out /app to /. Both sides get a
                           real three-item rail (2026-09-26, own-product
                           redesign — see DECISIONS.md): `BRAND_RAIL`
                           (Marketplace /app, Collaborations
                           /app/collaborations, Results /app/results) and
                           `CREATOR_RAIL` (Profile /app, Collaborations
                           /app/collaborations, Earnings /app/earnings), picked
                           by role via `showRail`. A creator briefly had no
                           rail at all (one screen didn't deserve nav chrome);
                           Earnings made three real destinations, so that
                           reasoning stopped applying — see DECISIONS.md.
                           App.tsx's AppIndex picks the index surface by role:
                           CreatorsListPage (brand) or CreatorHomePage
                           (creator — their own profile only now, "this is how
                           brands see you", from GET /creators/:id).
                           Collaborations lives at one URL, `/app/
                           collaborations`, role-branched by App.tsx's new
                           CollaborationsIndex (same pattern as AppIndex): a
                           brand gets CollaborationsPage (4.2) — every GET
                           /bookings/sent row via CollaborationsTable, a real
                           ?status= filter, CreatorsPagination reused
                           unmodified. A creator gets CreatorCollaborationsPage
                           (2026-09-25, extracted from CreatorHomePage's old
                           embedded section) — GET /bookings/received, typed
                           CreatorCollaboration (nextAction + netCents,
                           session A's contract), rows via
                           components/creator/CollaborationCard, sorted
                           actionable-first (`nextAction.consequence !== ""`),
                           real Accept/Decline on the "respond" kind, netCents
                           shown not agreedPriceCents, tracked link + copy
                           (components/creator/TrackedLinkRow) on any row that
                           has one regardless of nextAction. CreatorEarningsPage
                           (2026-09-26, creator-only at /app/earnings via a new
                           RequireCreator guard, the mirror of RequireBrand) —
                           GET /bookings/earnings (session A's contract,
                           already net of commission), tiles (total earned,
                           paid collaborations, average per deal, in transit)
                           + components/creator/EarningsChart (token-only
                           inline SVG bar chart, no dependency, newest month
                           solid). No withdraw control. Empty state triggers
                           on zero paid AND zero in-transit, not zero paid
                           alone — money already in transit still renders the
                           normal tiles.
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
                           A comparison list + persistent detail panel replaced
                           the card grid + modal 2026-09-25 (own-product
                           redesign, see DECISIONS.md) — a brand's job here is
                           comparing creators, which a grid-plus-modal made
                           one-at-a-time. CreatorComparisonList (a real Table:
                           checkbox, name + vertical/country, followers, median
                           views, CPM, post cost, sector fit badge, booking
                           status pill + "N clicks", star, Book — clicking a row
                           or Book selects it, threads bookingById same as
                           before). CreatorsPagination (Prev/Next + range,
                           unchanged). CreatorDetailPanel = the persistent right
                           pane (Card primitive): header (avatar, name, role
                           line, star), Tabs (Overview/Audience), then
                           BookingRail stacked below the tab content (was a side
                           column in the old 1080px modal; this pane is ~440px
                           and sticky, `lg:top-8`, so it stays alongside the
                           list while it scrolls). `CreatorsListPage` derives
                           which creator fills the panel — the explicit
                           selection if still in the current filtered/paged
                           list, else the top row, so the panel is never empty.
                           modal/ (name kept, contents relocated into the panel
                           rather than a dialog) has OverviewTab (its post card
                           is paged — "N of 5", prev/next, resets to post 1 per
                           creator; 2.12 folded in here rather than a third tab,
                           see DECISIONS.md), AudienceTab, BookingRail (real
                           submit: package radio + deliverable input -> POST
                           /bookings; renders one of the form / a booked
                           confirmation / an already-booked notice / a
                           retryable error, see bookingStatus.ts and
                           lib/api/errors.ts), ReachSparkline (inline-SVG),
                           audienceSegments.ts (dimension-filter helper). Two
                           tabs only (Overview, Audience) — no Content tab.
                           icons.tsx (NetworkBadge — no longer used by the list
                           row, kept for reuse; StarIcon).
        campaign/         CollaborationsTable (new, 4.2): Creator, Campaign,
                           Package, Agreed price, Status, Tracked link (copy
                           button + click count, gated on trackedLinkSlug
                           existing rather than on status === ACCEPTED, since
                           seed can place a booking straight at
                           SCHEDULED/LIVE/PAID with a link already minted).
                           Brief form, campaign list, status pills still land
                           with the rest of the campaign flow.
        dashboard/        AttributionTable (5.4): Creator, Accepted bookings,
                           Clicks, Last click (formatRelativeTime, new in
                           lib/format.ts). No ranking language, no expander —
                           see docs/DECISIONS.md. Metric tiles/charts (5.1-5.3)
                           are still cut.
        creator/          New 2026-09-25 (own-product redesign). CollaborationCard
                           (one collaboration, organised around nextAction — an
                           actionable tinted panel with the label/consequence/
                           Accept-Decline when consequence is non-empty, else a
                           plain muted line, deliberately not the same box in a
                           different colour). TrackedLinkRow (moved out of
                           CreatorHomePage.tsx, unchanged behaviour). Consumed
                           by routes/CreatorCollaborationsPage.tsx (its own
                           route as of 2026-09-26, was a CreatorHomePage
                           section). EarningsChart (2026-09-26): token-only
                           inline SVG bar chart, six months, newest solid —
                           same restraint as marketplace/modal/ReachSparkline.
packages/
  shared/                 Wire-safe types (enums.ts, entities.ts, api.ts) hand-kept
                           in sync with prisma/schema.prisma. Imported by both apps.
                           api.ts adds MarketplaceCreator + campaignId/q on
                           ListCreatorsParams, CampaignSummary, AddToShortlistBody,
                           BookingSent (GET /bookings/sent — Booking +
                           creatorDisplayName/campaignName/package, 4.2),
                           AttributionRow/AttributionResponse (GET
                           /analytics/attribution, 5.4).
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
