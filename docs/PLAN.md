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

- [x] **2.4 Marketplace grid shell** — done 2026-09-11.
  Scope: "All creators" title + ranking explainer, All/Shortlist tabs with
  counts, "Ranked for your company" strip, search box, sort-by control with the
  four options, "Top ranked creators" section header. No filters yet.
  Files: `apps/web/src/routes/CreatorsListPage.tsx`,
  `apps/web/src/components/marketplace/MarketplaceHeader.tsx`,
  `apps/web/src/lib/stores/creatorsStore.ts`.
  Notes: the standalone "Ranked for your company" strip was folded into the
  title explainer (anti-slop: three restatements of the ranking logic stacked).
  Search is a real server-side `q` param (name/headline contains); it was added
  to `GET /creators` this slice. `AppShell` was rebuilt as the 72px icon rail
  (DESIGN §layout) since it frames every marketplace screenshot; rail items past
  Creators are not wired to routes yet.

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

- [x] **2.7 Creator card** — done 2026-09-11.
  Scope: checkbox, LinkedIn/X badge, shortlist star, Book button, header band +
  overlapping avatar, name, vertical string + country, four-cell metric strip
  (followers, median views, CPM, post cost), "View profile" row.
  Files: `apps/web/src/components/marketplace/CreatorCard.tsx`,
  `apps/web/src/components/marketplace/icons.tsx` (new),
  `apps/web/src/lib/format.ts`.
  Notes: carries the ICP fit badge (real per-(creator, campaign) %, top row next
  to Book). The RECON "cloud-image header band" was dropped — no asset, and a
  flat colour block read as a placeholder against the anti-slop rules. The
  avatar is a real photo (`ui/Avatar`, seeded `avatarUrl`); initials are the
  fallback for a failed image load. Metric order is exactly followers / median
  views / CPM / post cost. "View profile" is a plain link, no trailing arrow
  (DESIGN). Book and View profile both open the profile modal.

- [x] **2.8 Shortlist** — done 2026-09-11, moved to the API 2026-09-11.
  Scope: shortlist store, star toggle persists, Shortlist tab shows saved
  creators with count, empty state names the marketplace.
  Files: `apps/web/src/lib/stores/shortlistStore.ts`,
  `apps/web/src/components/marketplace/*`, `apps/web/src/lib/api/*`,
  `apps/api/src/shortlist/*`, `apps/api/src/campaigns/*`.
  Notes: now server-backed and **campaign-scoped**, not localStorage. New
  `ShortlistItem` model (unique per campaign+creator). Routes:
  `GET|POST /campaigns/:id/shortlist`, `DELETE /.../:creatorId` (idempotent).
  `GET /campaigns/active` resolves the campaign the marketplace is ranked for
  (most recent LIVE, else most recent) — the shortlist keys to it. Store hydrates
  from the API and writes optimistically. The campaign Shortlist tab (3.5) reads
  the same rows. Star on card + modal; grid multi-select bulk-adds. Seed adds 13
  entries across three campaigns.

- [~] **2.9 Creator modal shell** — 2 of 3 tabs + rail done 2026-09-11.
  Scope: modal primitive in use — header (avatar, name, "AI · Marketing ·
  LinkedIn creator", star, close), three tabs, persistent booking rail column.
  Opens from both "Book" and "View profile". Shadow allowed here (DESIGN §depth).
  Files: `apps/web/src/components/marketplace/CreatorProfileModal.tsx`,
  `apps/web/src/components/marketplace/modal/*`, `apps/web/src/components/ui/Disclosure.tsx`.
  Done: two-column layout (tabbed content + persistent `BookingRail` aside),
  header with role line / star / close, Overview + Audience tabs. `BookingRail`
  has the single / bundle-of-5 radio (drives estimated CPM), typical reach,
  posts analysed, the literal "how pricing is calculated" formula, and a
  "how booking works" summary. Remaining for 2.9: the **Content tab** (that is
  slice 2.12) and the "Collaborate with <name>" CTA + `Booking` write (slice
  2.13). Modal role line avoids middle dots per DESIGN.

- [x] **2.10 Modal — Overview tab** — done 2026-09-11.
  Scope: blurb, two check chips (% in observed audience, typical reach), audience
  snapshot (job title + seniority segmented bars, "Estimated from N recent public
  engagers" caption backed by `observedEngagerCount`), reach sparkline + one
  recent post card, professional-profile accordion.
  Files: `apps/web/src/components/marketplace/modal/OverviewTab.tsx`,
  `apps/web/src/components/marketplace/modal/ReachSparkline.tsx`,
  `apps/web/src/components/marketplace/modal/audienceSegments.ts`.
  Notes: `ReachSparkline` is a token-only inline SVG (no chart dep). Recent-post
  card collapses newlines for the 3-line clamp, expands on "See full post".

- [x] **2.11 Modal — Audience tab** — done 2026-09-11.
  Scope: four dimension cards (job title, seniority, industry, geography), each a
  stacked bar with four labelled percentages summing to 100. Caption backed by
  `observedEngagerCount`. "See the full audience · N signals" expander.
  Files: `apps/web/src/components/marketplace/modal/AudienceTab.tsx`.
  Notes: uses the shared `SegmentedBar` primitive and the new `Disclosure`
  primitive (native `<details>` with the browser marker swapped for a chevron).

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

- 2026-09-11 — Screenshot-review fixes (no new slices):
  - **Avatars are photos.** Seed sets `avatarUrl` on every creator —
    `randomuser.me/api/portraits/{gender}/{n}.jpg`, portrait number stepped by a
    value coprime with 100 (40 distinct), gender from `FEMININE_NAMES`. New
    `components/ui/Avatar.tsx` renders it in the card, modal header, and the
    recent-post card, with the initials block as the **fallback** (image load
    failure), not the default. Fixtures got 6 URLs too.
  - **One modal only.** `CreatorProfileModal` is the sole modal component
    (tabbed shell + rail); no separate old component exists — the earlier
    single-column "Pricing / Latest post" layout was the same file before
    1b43ef2, replaced in place. Nothing reaches an old layout.
  - **Marketplace loading/error states** are framed panels in the shell now, not
    bare text: error is "The marketplace didn't load" + a **Try again** button
    (bumps a `reloadKey` + re-hydrates the shortlist). `/app` index is the only
    route; there is no `/app/creators`.
  - **BookingRail pricing is provably consistent.** `Disclosure` is now
    controlled (`useState` + `onToggle`) so a price-radio re-render can't snap
    it shut. The rail shows a "Selected €X (N post[s])" row, and the bundle
    formula spells out the ÷5 step, so radio + selected price + estimated CPM +
    formula always reconcile.
- 2026-09-11 — Shortlist moved to the API (campaign-scoped) + modal slices
  2.9(partial)/2.10/2.11. For the next session:
  - **Shortlist is server state now.** `ShortlistItem` model, `GET /campaigns/active`
    + `GET|POST|DELETE /campaigns/:id/shortlist`. `CampaignsService.getActive()`
    is the single source for "the active campaign" — `CreatorsService` now
    delegates to it (CreatorsModule imports CampaignsModule). `shortlistStore`
    holds `{campaignId, ids, status}`, hydrates once from
    `CreatorsListPage` mount, writes optimistically. localStorage/`persist` is
    gone.
  - **API mappers.** `apps/api/src/creators/mappers.ts` now owns
    `toCreatorProfile` / `toMarketplaceCreator`, shared by CreatorsService and
    ShortlistService.
  - **Modal.** `CreatorProfileModal` is the two-column shell (tabbed content +
    persistent `BookingRail`). Only Overview + Audience tabs exist — **Content
    tab is slice 2.12**, add it as a third `Tabs` item + `modal/ContentTab.tsx`.
    The "Collaborate with <name>" CTA and the `Booking` write are **2.13**; the
    rail deliberately has no CTA yet. `modal/audienceSegments.ts` has the
    dimension-filter helper both tabs use.
  - **New primitive.** `components/ui/Disclosure.tsx` (styled `<details>` with a
    chevron) — use it for any new accordion instead of a raw `<details>`.
  - **prisma reset** is still fine locally (no remote DB), but the new CLAUDE.md
    rule: once a remote exists it's forward-migrations-only. The
    `campaign_shortlist` migration is additive (applied without a reset); the
    reset afterwards was only to reseed shortlist rows.
- 2026-09-11 — Slices 2.4, 2.7, 2.8 done + 2.9 started; `Campaign.targetVertical`
  added ahead of the card so the ICP fit badge shows a real number. Key points
  for the next session:
  - **Ranking campaign.** `GET /creators` takes optional `?campaignId=`. Given
    one it 404s if unknown; omitted, it ranks against the **most recent LIVE
    campaign** as the implicit "your company" context (there is no campaign
    switcher yet). Response rows are `MarketplaceCreator` = `CreatorProfile` +
    `icpFitPct` (0..100, or `null` when no campaign exists at all). `best_match`
    is now **fit-band first, then the performance blend within a band** (not a
    weighted mix) — `creators/ranking.ts` takes an optional `fitById` map.
    `CreatorsService.audienceFitScore` / `audience-fit.ts` is now live (was
    uncalled). Seeded target verticals: Q4 RevOps→REVOPS, DevTools→DEVTOOLS,
    Fintech Trust→FINTECH (this is the active one — most recent LIVE),
    Summer Payouts→HR_TECH.
  - **`q` search param.** `GET /creators?q=` does a case-insensitive contains
    over displayName + headline. Added this slice for the 2.4 search box.
  - **Web API client** now takes `ListCreatorsParams` and has
    `getCreator(id): CreatorProfileDetail`. `http.ts` maps every param; the
    filter params (2.5/2.6) are already wired through the query builder, just
    not surfaced in UI yet.
  - **Shared build.** `packages/shared/src/index.ts` now names the cpm re-export
    (`export { cpmCents, cpmEur }`) — Rollup can't follow `export *` through the
    CJS/NodeNext interop for runtime values. `apps/web/vite.config.ts` also
    aliases `@naano/shared` to its **source** for the same reason. The API
    still consumes `dist`.
  - **2.9 modal.** `CreatorProfileModal.tsx` is the thin real version (see the
    2.9 line). Grow it into the tabbed shell + booking rail; don't restart.
  - **AppShell** is now the real 72px icon rail; only "Creators" routes.
  - `uiStore.ts` (sidebar collapse) has no consumer any more — left as the
    zustand pattern example per MAP, fair game to delete or repurpose.
  - `apps/web/vite.config.{js,d.ts}` were tracked build artifacts (tsc -b emits
    them; `tsconfig.node.json` is `composite`). Now gitignored + untracked;
    Vite loads the `.ts`.
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
