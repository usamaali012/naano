# PLAN.md — the running build checklist

Derived from `docs/RECON.md` sections 11 (build order) and 12 (cutting list).

**How to use this file.** Read it at the start of every session. Each slice is
sized to one working session: a checkbox, a one-line scope, and the files it
touches. When you finish a slice, tick it and note anything the next session
needs under "Discovered". Do not silently expand a slice — if it grows, split it
and add the new line here.

Status key: `[ ]` not started · `[~]` in progress · `[x]` done.

---

## Phase 1 — data truth

Blocks everything. Schema and seed are the plan here.

- [x] **1.1 Schema + seed per RECON §10** — done 2026-09-10.
  Scope: full data-model delta (medianViews, postCostCents, bundle5PriceCents,
  Icp, Booking.initiatedBy, AudienceSegment, CreatorPost, observedEngagerCount,
  postsAnalyzed, network enum). Migrate, reseed to the calibration + volume
  targets. CPM stays computed, never stored.
  Files: `apps/api/prisma/schema.prisma`, `apps/api/prisma/seed.ts`,
  `packages/shared/src/enums.ts`, `packages/shared/src/entities.ts`,
  `apps/api/src/creators/creators.service.ts`,
  `apps/web/src/lib/api/fixtures.ts`,
  `apps/web/src/components/marketplace/CreatorCard.tsx`.

---

## Phase 2 — marketplace and creator modal

Where the UX score is won. The modal is the densest surface; build it properly.

- [x] **2.1 Design tokens + UI primitives** — done 2026-09-10.
  Scope: token layer from `docs/DESIGN.md` as CSS custom properties wired into
  Tailwind. Primitives: button, card, input, select, checkbox, badge, status
  pill, table, tabs, modal, segmented-bar. Tokens only, no screens.
  Files: `apps/web/src/index.css`, `apps/web/tailwind.config.js`,
  `apps/web/src/components/ui/*`.

- [x] **2.2 Playwright screenshot harness** — done 2026-09-10.
  Scope: Playwright dev dep in the web app, npm script that shoots a route at
  1440px into `.screenshots/`. `.screenshots/` gitignored.
  Files: `apps/web/package.json`, `apps/web/scripts/shot.mjs`, `.gitignore`.

- [x] **2.3 Creators API: filters, sort, detail** — done 2026-09-10.
  Scope: extend `GET /creators` with industry, country, price range, and the
  performance filters (max CPM, min median views, min/max followers, min
  engagement, posted-recently); four sort modes (best match, price asc, most
  followers, best engagement). Add `GET /creators/:id` returning the profile
  plus audience segments and posts. CPM computed in a shared helper.
  Files: `apps/api/src/creators/creators.controller.ts`,
  `apps/api/src/creators/creators.service.ts`,
  `apps/api/src/creators/dto/list-creators.dto.ts`,
  `apps/api/src/creators/cpm.ts`, `packages/shared/src/api.ts`.

- [ ] **2.4 Marketplace grid shell**
  Scope: "All creators" title + ranking explainer, All/Shortlist tabs with
  counts, "Ranked for your company" strip, search box, sort-by control with the
  four options, "Top ranked creators" section header. No filters yet.
  Files: `apps/web/src/routes/CreatorsListPage.tsx`,
  `apps/web/src/components/marketplace/MarketplaceHeader.tsx`,
  `apps/web/src/lib/stores/creatorsStore.ts`.

- [ ] **2.5 Filter panel**
  Scope: industry searchable multi-select, country dropdown, price range slider
  over a histogram of the real distribution. Wire to the API from 2.3. Copy:
  "These filters hide creators; matching scores stay unchanged."
  Files: `apps/web/src/components/marketplace/FilterPanel.tsx`,
  `apps/web/src/components/marketplace/PriceHistogram.tsx`,
  `apps/web/src/lib/stores/creatorsStore.ts`, `apps/web/src/lib/api/*`.

- [ ] **2.6 Performance filters panel**
  Scope: separate panel — max CPM, min median views, min/max followers, min
  engagement %, posted-recently select. Clear / Apply buttons. Copy:
  "Creators with unavailable performance data remain visible."
  Files: `apps/web/src/components/marketplace/PerformanceFilters.tsx`,
  `apps/web/src/lib/stores/creatorsStore.ts`.

- [ ] **2.7 Creator card**
  Scope: checkbox, LinkedIn/X badge, shortlist star, Book button, header band +
  overlapping avatar, name, vertical string + country, four-cell metric strip
  (followers, median views, CPM, post cost), "View profile" row.
  Files: `apps/web/src/components/marketplace/CreatorCard.tsx`,
  `apps/web/src/lib/format.ts`.

- [ ] **2.8 Shortlist**
  Scope: shortlist store, star toggle persists, Shortlist tab shows saved
  creators with count, empty state names the marketplace.
  Files: `apps/web/src/lib/stores/shortlistStore.ts`,
  `apps/web/src/components/marketplace/*`, `apps/web/src/lib/api/*`.

- [ ] **2.9 Creator modal shell**
  Scope: modal primitive in use — header (avatar, name, "AI · Marketing ·
  LinkedIn creator", star, close), three tabs, persistent booking rail column.
  Opens from both "Book" and "View profile". Shadow allowed here (DESIGN §depth).
  Files: `apps/web/src/components/marketplace/CreatorModal.tsx`,
  `apps/web/src/routes/CreatorsListPage.tsx`.

- [ ] **2.10 Modal — Overview tab**
  Scope: blurb, two check chips (% in observed audience, typical reach), audience
  snapshot (job title + seniority segmented bars, "Estimated from N recent public
  engagers" caption backed by `observedEngagerCount`), reach sparkline + one
  recent post card, professional-profile accordion.
  Files: `apps/web/src/components/marketplace/modal/OverviewTab.tsx`,
  `apps/web/src/components/ui/SegmentedBar.tsx`,
  `apps/web/src/components/marketplace/modal/ReachSparkline.tsx`.

- [ ] **2.11 Modal — Audience tab**
  Scope: four dimension cards (job title, seniority, industry, geography), each a
  stacked bar with four labelled percentages summing to 100. Caption backed by
  `observedEngagerCount`. "See the full audience · N signals" expander.
  Files: `apps/web/src/components/marketplace/modal/AudienceTab.tsx`.

- [ ] **2.12 Modal — Content tab**
  Scope: content signals column (topic chips, latest post date, posts observed in
  30 days, typical range, posts analyzed, reach sparkline) + post carousel
  ("1 of 5") over `CreatorPost` with full text expander, "Open original" link,
  engagement row (views, reactions, comments, reposts).
  Files: `apps/web/src/components/marketplace/modal/ContentTab.tsx`,
  `apps/web/src/components/marketplace/modal/PostCarousel.tsx`.

- [ ] **2.13 Booking rail**
  Scope: "Book this creator", single-post vs bundle-of-5 radio with prices,
  typical reach / estimated CPM / posts analyzed, "How pricing is calculated"
  expander showing `postCost ÷ medianViews × 1000`, CTA "Collaborate with
  <first name>", "Secure booking · Creator approves first". CTA creates a
  `Booking` (initiatedBy BRAND) against the active campaign.
  Files: `apps/web/src/components/marketplace/modal/BookingRail.tsx`,
  `apps/api/src/bookings/*`, `apps/web/src/lib/api/*`.

---

## Phase 3 — campaign and brief

- [ ] **3.1 Campaigns + Icp API**
  Scope: `GET /campaigns` (paginated, tab filter), `GET /campaigns/:id`,
  campaign carries up to three `Icp`. Seed briefs already realistic.
  Files: `apps/api/src/campaigns/*`, `packages/shared/src/api.ts`.

- [ ] **3.2 Campaign list page**
  Scope: All/Active/Draft/Completed tabs + count, campaign cards (logo, status
  dot, created-on, title, brief excerpt, three stats, footer links), create card.
  Files: `apps/web/src/routes/CampaignsPage.tsx`,
  `apps/web/src/components/campaign/CampaignCard.tsx`,
  `apps/web/src/components/campaign/StatusPill.tsx`.

- [ ] **3.3 Campaign detail shell**
  Scope: back link, title, status pill, campaign switcher, "Invite a creator"
  (routes to marketplace), four tabs.
  Files: `apps/web/src/routes/CampaignDetailPage.tsx`,
  `apps/web/src/components/campaign/*`.

- [ ] **3.4 Brief tab**
  Scope: four sections — context & objective, audience & tone, editorial rules
  (Do / Avoid two-column), angles & post examples (genuine numbered list, each
  with quoted guidance block + expandable post example). "Naano AI" badge, "Edit
  the brief" action.
  Files: `apps/web/src/components/campaign/BriefTab.tsx`.

- [ ] **3.5 Campaign shortlist tab**
  Scope: campaign-scoped shortlist, empty state "Save creators from the
  marketplace…" with a Find creators button.
  Files: `apps/web/src/components/campaign/CampaignShortlistTab.tsx`.

- [ ] **3.6 Invite a creator → Booking**
  Scope: invite action from marketplace/shortlist creates `Booking`
  (initiatedBy BRAND, status INVITED) tied to the campaign; shows in
  Collaborations "Invitations sent".
  Files: `apps/api/src/bookings/*`, `apps/web/src/components/marketplace/*`.

---

## Phase 4 — creator side

- [ ] **4.1 Bookings state machine + next-action**
  Scope: accept / decline transitions, `initiatedBy` respected, "Next action"
  derived from status + role.
  Files: `apps/api/src/bookings/bookings.service.ts`,
  `apps/api/src/bookings/next-action.ts`, `packages/shared/src/api.ts`.

- [ ] **4.2 Collaborations table**
  Scope: table (Creator, Campaign, Status, Next action, Due date, Amount,
  Updated), status tabs with counts incl. Invitations received / sent, campaign
  filter, search, rows-per-page. Real empty state.
  Files: `apps/web/src/routes/CollaborationsPage.tsx`,
  `apps/web/src/components/campaign/CollaborationsTable.tsx`.

- [ ] **4.3 Accept issues a TrackedLink**
  Scope: accepting a booking mints a `TrackedLink` (slug + resolved
  destinationUrl); link surfaced to the creator.
  Files: `apps/api/src/bookings/bookings.service.ts`,
  `apps/api/src/tracking/*`.

- [ ] **4.4 Earnings view**
  Scope: creator-side list of bookings with amounts and payout status.
  Files: `apps/web/src/routes/EarningsPage.tsx`,
  `apps/api/src/bookings/*`.

---

## Phase 5 — results

- [ ] **5.1 Analytics aggregates**
  Scope: `groupBy` over `ClickEvent` — est. reach, qualified clicks (isLead),
  committed budget, daily clicks series, attribution by creator. Campaign filter.
  Files: `apps/api/src/analytics/*`, `packages/shared/src/api.ts`.

- [ ] **5.2 Metric cards**
  Scope: three cards with the RECON captions ("No published posts yet",
  "last 30 days", "N bookings"), period selector.
  Files: `apps/web/src/routes/ResultsPage.tsx`,
  `apps/web/src/components/dashboard/MetricCard.tsx`.

- [ ] **5.3 Performance over time**
  Scope: daily clicks chart, dated axis, period selector.
  Files: `apps/web/src/components/dashboard/PerformanceChart.tsx`.

- [ ] **5.4 Attribution by creator**
  Scope: table, Creator + Clicks columns, "More metrics & attribution details"
  expander.
  Files: `apps/web/src/components/dashboard/AttributionTable.tsx`.

---

## Phase 6 — ship

Reserve three hours minimum.

- [ ] **6.1 Deploy** — API + web + Postgres reachable.
- [ ] **6.2 Demo entry on `/`** — public home routes into a seeded logged-in
  feeling brand session.
- [ ] **6.3 Walkthrough video + README** — record the core loop; README names
  what was cut and why.

---

## Cutting list — stated in the walkthrough

Product judgement is scored; naming what was deliberately left out is how you
show it.

- Agency side entirely.
- Real payment rails. The wallet UI may exist with fake balances.
- AI Matching conversational mode.
- The conversion pixel (a layer above click tracking).
- LinkedIn OAuth and any real LinkedIn API.
- Messages.
- The Leads tab and ICP account enrichment.
- The MCP / Connect server.
- i18n, the blog, the SEO page tree.
- The floating AI command bar (RECON §2). Leave it out rather than render a
  non-functional signature element; revisit only if it can route to filtered
  marketplace results.

---

## Discovered

Notes handed forward between sessions. Newest first.

- 2026-09-10 — Slice 2.3 done (creators API filters/sort/detail). Next natural
  slice is 2.4 (marketplace grid shell) or 2.7 (creator card). The web api
  client (`apps/web/src/lib/api/{client,http,fixtures}.ts`) still only exposes
  `listCreators(PageParams)` — extend it to take `ListCreatorsParams` and add
  `getCreator(id): CreatorProfileDetail` when 2.4 / 2.9 land; it was left
  untouched here to keep the slice API-only. Param names: industry is `vertical`
  (repeatable, `?vertical=SALES&vertical=REVOPS`); `country` is a 2-letter code,
  case-insensitive; price is `priceMinCents`/`priceMaxCents`; performance filters
  are `maxCpmEur`, `minMedianViews`, `minFollowers`, `maxFollowers`,
  `minEngagementPct` (whole %), `postedWithinDays`. `sort` is one of
  `best_match|price_asc|followers_desc|engagement_desc`. `best_match` is a
  verified-performance blend only (`creators/ranking.ts`) — sector fit joins in
  once Campaign carries a target vertical. The `maxCpmEur` filter deliberately
  keeps creators whose CPM is unknown (no median views) visible; the seed has no
  such rows so that path is untested against real absent data.
- 2026-09-10 — Plan created. Slices 1.1, 2.1, 2.2 done the same session. Next
  natural slice is 2.3 (creators API: filters, sort, `GET /creators/:id`
  returning segments + posts) or 2.4 (marketplace grid shell). The pre-token
  screens (AppShell, CreatorCard, CreatorsListPage, PublicHome, Pagination)
  still use stock `slate-*` classes — migrate each to tokens inside its slice,
  not as a separate pass. `packages/shared/src/cpm.ts` already has the CPM
  helper; use it, don't re-derive. Seed volume is fixed at reseed time — rerun
  `npm run prisma:seed` (from repo root or `apps/api`) after any schema change;
  it resets nothing, so run `prisma migrate reset` first if columns changed.
- 2026-09-10 — Windows note: stop every running `node dist/main.js` / dev
  process before `prisma generate` or `migrate` or you get EPERM on the engine
  DLL. The screenshot script needs the dev server up; from Git-Bash prefix
  `MSYS_NO_PATHCONV=1` so the leading `/` in the route isn't path-mangled.
