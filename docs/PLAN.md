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

- [~] **2.5 Filter panel** — industry/country/follower range done 2026-09-11,
  price range deferred.
  Scope: industry searchable multi-select, country dropdown, price range slider
  over a histogram of the real distribution. Wire to the API from 2.3. Copy:
  "These filters hide creators; matching scores stay unchanged."
  Files: `apps/web/src/components/marketplace/FilterPanel.tsx`,
  `apps/web/src/components/marketplace/PriceHistogram.tsx`,
  `apps/web/src/lib/stores/creatorsStore.ts`, `apps/web/src/lib/api/*`.
  Done: `FilterPanel` ships industry (searchable multi-select checkboxes),
  country (dropdown) and follower min/max, wired to the `vertical`/`country`/
  `minFollowers`/`maxFollowers` params 2.3 already exposed. Active filters
  render as removable chips plus one "Clear all"; the empty state
  distinguishes search vs. filters vs. both. `fixtures.ts` mirrors the same
  filtering so the CLAUDE.md hedge stays real in both modes. Verified against
  the live 40-creator seed (see DECISIONS 2026-09-11 for the exact counts).
  Deferred: `PriceHistogram.tsx` and the price-range slider — assignment
  scoped this session to vertical/country/follower range only; the copy line
  above still applies once price lands.

- [ ] **2.6 Performance filters panel**
  Scope: separate panel — max CPM, min median views, min/max followers, min
  engagement %, posted-recently select. Clear / Apply buttons. Copy:
  "Creators with unavailable performance data remain visible."
  Files: `apps/web/src/components/marketplace/PerformanceFilters.tsx`,
  `apps/web/src/lib/stores/creatorsStore.ts`.
  Note: min/max followers already live in `creatorsStore` from 2.5's follower
  range — 2.6 should reuse that state rather than re-adding it. Remaining
  scope: max CPM, min median views, min engagement %, posted-recently, in
  their own panel with Clear/Apply.

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

- [x] **2.12 Modal — Content tab** — done differently, 2026-09-11: folded
  into Overview rather than shipped as a third tab.
  Scope (as speced): content signals column (topic chips, latest post date,
  posts observed in 30 days, typical range, posts analyzed, reach sparkline)
  + post carousel ("1 of 5") over `CreatorPost` with full text expander,
  "Open original" link, engagement row (views, reactions, comments, reposts).
  Files (as speced): `apps/web/src/components/marketplace/modal/ContentTab.tsx`,
  `apps/web/src/components/marketplace/modal/PostCarousel.tsx`.
  What shipped instead: Overview's existing post card (already had full
  text expander, "Open original", engagement row for post #1) gained a
  pager — "N of 5", prev/next, resets to post 1 on a new creator, no pager
  for a single-post creator. The "Content performance" header gained a
  date-range caption ("5 posts, 9 Aug – 9 Sept", relative to the posts
  themselves — see the DECISIONS.md entry for why not "last 30 days").
  Reason: RECON's Content tab, checked line by line against the built
  Overview tab, turned out to be one genuinely new thing (posts 2–5,
  previously unreachable) wrapped in three restatements of what Overview or
  the always-visible BookingRail already show (the sparkline, "posts
  analysed", "latest post date") plus one chip with no backing data in the
  schema (topics). Building it as a full third tab would have shipped a
  weaker duplicate; folding the one real addition into Overview was judged
  the stronger outcome. No `ContentTab.tsx`/`PostCarousel.tsx`, no third
  `Tabs` item.
  Files touched: `apps/web/src/components/marketplace/modal/OverviewTab.tsx`.

- [x] **2.13 Booking rail** — done 2026-09-10.
  Scope: "Book this creator", single-post vs bundle-of-5 radio with prices,
  typical reach / estimated CPM / posts analyzed, "How pricing is calculated"
  expander showing `postCost ÷ medianViews × 1000`, CTA "Collaborate with
  <first name>". CTA creates a `Booking` (initiatedBy BRAND) against the
  active campaign. Grew to cover the full loop end to end (both sides, not
  just the rail) per an explicit ask: real bookings API, creator accept/
  decline, and brand-side visibility.
  Files: `apps/api/src/bookings/*` (controller/service/dto/mappers, was an
  empty stub), `apps/api/src/campaigns/campaigns.service.ts`
  (`getActiveForCompany`), `packages/shared/src/api.ts`,
  `apps/web/src/lib/api/*` (+ new `errors.ts`),
  `apps/web/src/lib/stores/bookingsStore.ts` (new),
  `apps/web/src/lib/bookingStatus.ts` (new),
  `apps/web/src/components/marketplace/modal/BookingRail.tsx`,
  `apps/web/src/components/marketplace/{CreatorCard,CreatorGrid}.tsx`,
  `apps/web/src/routes/{CreatorsListPage,CreatorHomePage}.tsx`,
  `apps/web/scripts/shots.mjs`.
  Notes: see the two 2026-09-10 DECISIONS.md entries for the endpoint list,
  the company-scoped active-campaign fix, the server-side price derivation,
  the duplicate-booking guard, and why brand-side visibility is a card badge
  rather than a new Collaborations screen (that's 4.2).

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

- [x] **4.2 Collaborations table** — done 2026-09-11, in two passes (steps
  1–3, then step 4 once session B's merge landed — see the Discovered
  entries for both dates). Scope, as actually built (narrower than the
  RECON-derived scope above, by
  explicit ask): table (Creator, Campaign, Package, Agreed price, Status,
  Tracked link + click count), a real `?status=` dropdown (not tabs with
  counts — not free), Prev/Next pagination (existing `CreatorsPagination`,
  reused unmodified). No campaign filter, no search, no "Next action" (4.1
  isn't built), no Due date/Updated columns — none of those were asked for
  this pass. Real empty state, keyed to whether a status filter is active.
  Files: `apps/api/src/bookings/{dto/list-bookings-sent.dto.ts,
  bookings.service.ts,mappers.ts,bookings.controller.ts}`,
  `packages/shared/src/api.ts` (new `BookingSent`),
  `apps/web/src/routes/CollaborationsPage.tsx` (new),
  `apps/web/src/components/campaign/CollaborationsTable.tsx` (new),
  `apps/web/src/routes/AppShell.tsx`, `apps/web/src/App.tsx`,
  `apps/web/scripts/shots.mjs`, `apps/web/src/lib/api/{client.ts,http.ts,
  fixtures.ts}` (step 4, additive only — see the second 2026-09-11
  Discovered entry for exactly what changed in each).
  Notes: this slice also did problem 2 from the same ask — the left rail was
  four buttons with no `onClick` and no route. `AppShell.tsx` is now
  role-aware: brand gets two real destinations (Marketplace, Collaborations,
  active state from the current path), a creator gets no rail at all — see
  the 2026-09-11 DECISIONS.md entry for why one permanently-active icon was
  rejected as decoration, not navigation. `App.tsx` gained a `RequireBrand`
  route guard so `/app/collaborations` isn't just hidden from a creator, it
  actually redirects one who reaches the URL. `package` isn't a stored
  column — see DECISIONS.md for the derivation and why `deliverable` isn't
  trusted for it. All three workspaces (`api`, `web`, `shared`) typecheck
  clean; the screenshot suite (including the new `collaborations` shot) was
  regenerated after the merge and Collaborations was re-verified rendering
  real data — see the second 2026-09-11 Discovered entry for the numbers.

- [x] **4.3 Accept issues a TrackedLink** — done 2026-09-11.
  Scope: accepting a booking mints a `TrackedLink` (slug + resolved
  destinationUrl); link surfaced to the creator.
  Files: `apps/api/src/bookings/bookings.service.ts`,
  `apps/api/src/bookings/mappers.ts`, `apps/api/src/bookings/dto/*`,
  `apps/api/src/tracking/slug.ts` (new), `packages/shared/src/entities.ts`,
  `apps/web/src/lib/trackedLink.ts` (new),
  `apps/web/src/lib/stores/bookingsStore.ts`,
  `apps/web/src/components/marketplace/{CreatorCard,CreatorGrid}.tsx`,
  `apps/web/src/components/marketplace/modal/BookingRail.tsx`,
  `apps/web/src/routes/CreatorHomePage.tsx`, `apps/web/src/lib/api/fixtures.ts`.
  Notes: `updateStatus` mints the link in the same `$transaction` as the
  ACCEPTED write (slug = 12-char base64url, 72 bits, `tracking/slug.ts`);
  `destinationUrl` copies from the booking's own campaign, never from client
  input. `Booking` gained `trackedLinkSlug`/`clickCount` (null until a link
  exists) — cheapest way to carry this without a new type, since
  `BookingReceived`/brand `listSent` both already return `Booking`. Creator
  side: each booking card with a link shows it plus a working copy button
  (`CreatorHomePage`'s new `TrackedLinkRow`). Brand side: `CreatorCard` shows
  "N clicks" next to the existing booking-status pill — the cheapest surface,
  no new page, per an explicit ask. Verified end to end against the running
  API (see the 2026-09-11 DECISIONS.md entry for the actual numbers).
  Discovered a real blocker while wiring the screenshot fix below: see that
  DECISIONS.md entry for the `dev/bookings/ensure-invited` addition it
  required.

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
- [x] **6.2 Demo entry on `/`** — done 2026-09-11.
  Scope: public home routes into a seeded logged-in feeling brand session.
  Files: `apps/web/src/routes/EntryPage.tsx` (new, replaces `PublicHome.tsx`),
  `apps/web/src/routes/CreatorHomePage.tsx` (new), `apps/web/src/App.tsx`,
  `apps/web/src/routes/AppShell.tsx`, `apps/web/src/lib/stores/authStore.ts`
  (new), `apps/web/src/lib/api/*`, `apps/api/src/auth/*`.
  Notes: two one-click sign-ins (brand = Ledgerly, creator = the seed's index-0
  creator) do a real `POST /auth/login` + `GET /auth/me` (new, JWT-guarded) and
  land role-aware — brand on the marketplace, creator on a real "your profile"
  page (their own `GET /creators/:id`, i.e. exactly what a brand sees). No
  fake session. `/app` redirects signed-out visitors back to `/`. Shell gained
  a top bar: signed-in identity + Sign out. Demo password lives only in
  `EntryPage.tsx` and the seed — not repeated in docs.
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

- 2026-09-11 (Session B) — 2.12 done differently: folded into Overview
  instead of a third tab. Checked RECON's Content tab line by line against
  the already-built Overview tab:

  | RECON left-column item | Verdict |
  |---|---|
  | Topic chips (AI, Marketing, SaaS) | No backing field anywhere in the schema — would be fabricated, not derived. Dropped. |
  | Reach sparkline | Literal duplicate of Overview's, same component, same data. Dropped. |
  | Latest post date | Same value as post #1's date, already on Overview's post card. Dropped. |
  | Posts analysed | Always visible in `BookingRail` regardless of which tab is open. Dropped. |
  | Posts 2–5 (the carousel) | **The only genuinely new thing** — Overview only ever showed post #1. Kept, folded in. |

  So: `OverviewTab.tsx`'s existing post card gained a pager instead —
  `postIndex` state, "N of 5", prev/next (disabled at the ends, no pager for
  a single-post creator), resets to post 1 via a `useEffect` keyed on
  `creator.id` so switching creators doesn't leave the pager mid-deck. The
  "Content performance" header gained a caption reading `"5 posts, 9 Aug –
  9 Sept"` — deliberately the post set's own oldest/newest dates, not
  anything measured against today: `CreatorPost.publishedAt` in
  `seed.ts` is generated within ~35 days *of seed time*, not of whenever a
  reviewer opens the demo, so a "posts in the last 30 days" figure would
  silently go stale (read 0) without a reseed. No `ContentTab.tsx`,
  `PostCarousel.tsx`, or third `Tabs` item — `CreatorProfileModal.tsx`
  untouched. Verified live: pager advances/retreats correctly, disables at
  both ends, collapses an open "See full post" on every page change, and a
  fresh creator always opens on post 1. Typechecked `packages/shared`,
  `apps/web`, `apps/api` clean.
- 2026-09-11 (Session B) — Third merge: origin/main brought in the
  Collaborations table (4.2), an honest role-aware `AppShell` left rail
  (creators get no rail), and the widened `listBookingsSent` (see the
  session-A entry below for the detail). Merged clean, no conflicts at all
  — not even in docs. Re-ran all five filter counts against the merged
  code — unchanged: `vertical=SALES` alone → 5, `vertical=SALES,DEVTOOLS` →
  10, `country=PT` → 1, `country=FR` → 1, `minFollowers=75000` → 2, the
  combined vertical+country+range+q query → 1 (Maya Ferrari). Typechecked
  `packages/shared`, `apps/web`, `apps/api` clean. Next: slice 2.12 (modal
  Content tab), staying inside `apps/web/src/components/marketplace/` —
  Session A owns `apps/web/src/routes/`, the bookings API, and tracking.
- 2026-09-11 — Slice 4.2 closed: step 4, after session B's merge landed on
  `main` (`git pull origin main` was a no-op by the time this ran — the
  merge commits were already local). Widened `ApiClient.listBookingsSent`
  in `client.ts`/`http.ts` to return `BookingSent` and accept `status`
  (query param, `http.ts`). `fixtures.ts`'s additive change, nothing else in
  it touched: `fixtureBookings` is now typed `BookingSent[]` (a superset of
  `Booking`, so `createBooking`'s `Promise<Booking>` return is unaffected);
  `createBooking` sets `creatorDisplayName`/`campaignName`/`package` from
  data it already has (the matched fixture creator, `FIXTURE_CAMPAIGN.name`,
  `body.package` — no derivation needed in fixtures, unlike the real API);
  `listBookingsSent` filters on `status` the same way it already filtered
  on `campaignId`. All three workspaces typecheck clean
  (`npm run build --workspace={packages/shared,apps/api,apps/web}`) — the
  two expected `CollaborationsPage.tsx` errors from the steps-1–3 commit are
  gone, and nothing else in the web app regressed from session B's merge
  (spot-checked the marketplace grid + filter panel and the error state via
  screenshot). Re-verified Collaborations end to end post-merge via
  Playwright: unfiltered table shows real data (creator, campaign, package,
  price, status, tracked link/clicks); selecting "Accepted" in the status
  dropdown narrows 20 rows to 5, all reading "Accepted" — the server-side
  `?status=` filter, inert in the steps-1–3 commit, now actually works.
  Screenshot suite regenerated including the new `collaborations` shot (9
  images total). 4.2 is fully done; nothing pending.
- 2026-09-11 — Slice 4.2 (Collaborations + honest rail), steps 1–3 only —
  **step 4 is not done, and is the very next thing to do once session B has
  pushed.** Step 4: widen `ApiClient.listBookingsSent` in
  `apps/web/src/lib/api/client.ts` and `http.ts` to return `BookingSent` and
  accept `status`, plus the matching additive change to `fixtures.ts`
  (add `creatorDisplayName`/`campaignName`/`package` to the fixture booking
  objects and a `status` filter to `listBookingsSent`'s fixture
  implementation). `fixtures.ts` was on session B's protected list this
  session (they were mid-merge on `CreatorsListPage.tsx`,
  `creatorsStore.ts`, `FilterPanel.tsx`, `countries.ts`, and `fixtures.ts`
  itself) — steps 1–3 deliberately touch none of those five files. Until
  step 4 lands: `npx tsc -b apps/web/tsconfig.json` fails with exactly two
  errors in `CollaborationsPage.tsx` (known, see the 2026-09-11 PLAN.md 4.2
  entry and DECISIONS.md), and the screenshot suite's new `collaborations`
  shot has not been captured yet — `npm run shots` needs step 4 done first,
  then a full regen, then commit + this-file/DECISIONS/MAP updated again
  (under this session's own headings, not rewriting the entries below).
  See the 2026-09-11 DECISIONS.md entry for the package-derivation reasoning
  and the creator-rail decision (dropped entirely, not shrunk to one icon).

- 2026-09-11 (Session B) — Second merge: origin/main moved four more commits
  (Session A's last build task — see the two entries below this one:
  bookingsStore most-recent-booking fix, the demo-creator endpoint, and the
  seeded destination-URL fix). Only docs and `fixtures.ts` overlapped this
  time (both additive, `fixtures.ts` auto-merged clean); `CreatorsListPage`
  didn't conflict again. Re-ran all five filter counts against the merged
  code — unchanged: `vertical=SALES` alone → 5, `vertical=SALES,DEVTOOLS` →
  10, `country=PT` → 1, `country=FR` → 1, `minFollowers=75000` → 2, the
  combined vertical+country+range+q query → 1 (Maya Ferrari). Typechecked
  `packages/shared`, `apps/web`, `apps/api` clean.
- 2026-09-11 (Session B) — Merged main (booking loop, tracked links,
  sector-fit rename, demo entry — 50+ files, see the entries below this one)
  into the 2.5 filter panel work and re-wired `FilterPanel` into main's
  current `CreatorsListPage` (booking-store hydration, card status badge,
  framed loading/error + retry). Re-verified all five filter counts against
  the current code post-merge — unchanged from the pre-merge numbers (see
  DECISIONS 2026-09-11). Also fixed a pluralization bug this merge surfaced:
  `MarketplaceHeader`'s subtitle (now "All {totalCount} creators, ordered
  by…", renamed from "sector fit" — see the sector-fit-rename entry below)
  rendered "All 1 creators" for a single-result filter; it now reads "1
  creator, ordered by…" for the singular case. Superseded my own
  pre-merge note below about the old "The 1 strongest profiles" copy — that
  wording no longer exists on main, this is its replacement.
- 2026-09-11 (Session B) — 2.5 filter panel: industry/country/follower range
  only, price range and all of 2.6 deliberately deferred (see the 2.5/2.6
  lines above). For the next session:
  - **New files.** `apps/web/src/components/marketplace/FilterPanel.tsx`
    (industry multi-select + country + follower range + chips + clear-all),
    `apps/web/src/lib/countries.ts` (the 15 seeded country codes → display
    name, read from `seed.ts` not re-derived from the API — there's no
    distinct-countries endpoint).
  - **Store.** `creatorsStore` gained `vertical: Vertical[]`, `country`,
    `minFollowers`, `maxFollowers` + setters, each resetting `page` to 1 like
    the existing sort/query/tab setters.
  - **Empty state.** `CreatorsListPage`'s `EmptyState` now takes `hasFilters`
    and distinguishes three cases: query only, filters only, both — "Clear
    search and filters" only appears when both are active.
  - **Fixtures parity.** `fixtures.ts` filters by vertical/country/follower
    range now too, matching `http.ts`'s query semantics, so `VITE_API_MODE`
    switching doesn't silently lose filtering.
  - **Verified against the live seed** (40 creators, see DECISIONS
    2026-09-11 for exact counts) — a single vertical, two verticals, a rare
    country, an exclusive follower range, and a combined vertical+country+
    range+search query all matched hand-computed expectations in both the
    raw API and the UI, with header count / section subtitle / pagination
    footer agreeing with the grid throughout.
  - **Not done:** price range + `PriceHistogram.tsx` (rest of 2.5), all of
    2.6 (max CPM, min median views, min engagement %, posted-recently) — see
    the 2.6 line's note about reusing the follower-range state already in
    the store.
- 2026-09-11 — Session A's last build task: fixed the stale-card bug found
  the same day (below). `bookingsStore.hydrate()` now keeps the *most
  recent* booking per creator instead of whichever sorts last in the loop —
  see the second 2026-09-11 DECISIONS.md entry for the fix, the reasoning
  for choosing "most recent" over any other tie-break, and the three cases
  verified on the local stack (Adam Bauer's card now reads Invited instead
  of Declined; a single-booking creator renders unchanged; a fresh booking
  on a creator with no live history shows Invited immediately with no
  reload). Session A is done building after this commit.
- 2026-09-11 — Live-site review pass: fixed the two-sided demo loop and the
  broken tracked-link destinations (both committed separately), verified
  click tracking, regenerated screenshots. For the next session:
  - **`bookingsStore.hydrate()` could pin the marketplace card to a stale
    booking — fixed the same day, see the entry above.**
    (`apps/web/src/lib/stores/bookingsStore.ts`) When a creator has more than
    one booking against the campaign the marketplace is ranked against (a
    DECLINED one plus a fresh one — normal, since `create()` only blocks a
    second *non-declined* booking for the same creator+campaign), the
    `byCreatorId` build loop overwrote in `createdAt desc` array order, so
    the *oldest* row won, not the current one. Reproduced with real seed
    data: Adam Bauer has exactly this (DECLINED + a newer INVITED, both
    against Fintech Trust Campaign) and his marketplace card rendered
    "Declined" despite the live pending invite. Likely explanation for what
    was seen on the live site (a brand card whose click count didn't move
    after a click) — see the 2026-09-11 DECISIONS.md entries for the full
    repro and the fix. Recording itself was always correct (verified 0→3,
    both API and a rendered card, in the first of those entries).
  - **`GET /auth/demo-creator` (public) and `EntryPage.tsx`'s "Continue as a
    creator"** no longer hardcode a creator email — see DECISIONS.md. If a
    future session changes how bookings resolve "the demo brand" or "the
    active campaign," this endpoint's `DEMO_BRAND_EMAIL` constant
    (`apps/api/src/auth/auth.service.ts`) needs to move in step.
  - **Seeded `Campaign.destinationUrl`s are `example.com` paths now, not
    subdomains of it** (subdomains don't resolve). A database seeded before
    this change needs `apps/api/prisma/fix-destination-urls.ts` run once by
    hand — see DECISIONS.md for the exact command. Not yet run against
    production as of this entry.
- 2026-09-11 — TrackedLink on accept (4.3) + two screenshot-suite fixes. For
  the next session:
  - **Emma Berg (the demo creator) is structurally unbookable by Ledgerly
    (the demo brand) for a fresh INVITED row.** Seed already pairs her with
    every campaign Ledgerly has (LIVE Fintech Trust → PAID, completed Summer
    Payouts → PAID), and `POST /bookings` 409s on any non-DECLINED booking
    for the same creator+campaign. A real "brand books Emma" UI flow can
    never produce an INVITED row for her, no matter how many times you
    retry. Added a dev-only `POST /dev/bookings/ensure-invited` (guarded by
    `NonProductionGuard`, same pattern as `/dev/tracked-links`) that no-ops
    if the creator already has an INVITED booking, else picks a campaign
    they have zero relationship with yet and creates one there — it does
    **not** reuse `create()`'s campaign resolution, specifically to avoid
    landing a second booking in a campaign they're already in. `shots.mjs`
    calls it before the creator-home shots. If Phase 4.1/4.2 add a real
    "invite a creator" UI test path, prefer that over this endpoint where
    possible; this exists because no such path exists yet.
  - **`CreatorHomePage`'s booking section is now "Your bookings"**, not
    "Booking requests" — it lists every status (Paid/Live/Declined
    included), which "requests" never accurately described. Accept/Decline
    still only render on INVITED rows.
  - **`Booking` (shared type) gained `trackedLinkSlug` and `clickCount`**
    (both `| null`). Every booking read (`create`, `listReceived`,
    `listSent`, `updateStatus`) now selects `trackedLink: { slug, _count:
    { clickEvents } }` — see `TRACKED_LINK_SELECT` in
    `bookings.service.ts`. `bookingsStore`'s `byCreatorId` values are now
    `{ status, clickCount }` (was a bare `BookingStatus`) — anything reading
    it needs the `.status` accessor now.
  - **Seed already had TrackedLinks + real ClickEvent counts on the
    ACCEPTED+ seeded bookings** (`TRACKED_LINK_STATUSES` in `seed.ts`
    predates this slice) — this slice only had to wire `updateStatus` to do
    the same thing live, and to surface both sides in the UI. No seed change
    was needed for the core feature.
- 2026-09-10 — Booking loop (2.13, done end to end, both sides). For the
  next session:
  - **`bookings/` is no longer a stub.** Four routes, all role- and
    ownership-guarded: `POST /bookings` (COMPANY), `GET /bookings/received`
    (CREATOR, own profile only), `GET /bookings/sent` (COMPANY, own company,
    optional `?campaignId`), `PATCH /bookings/:id/status` (CREATOR,
    INVITED→ACCEPTED|DECLINED only). See DECISIONS.md for the full rationale.
  - **`CampaignsService.getActive()` is still global** (most recent LIVE
    across all companies) — only the new `getActiveForCompany(companyId)`
    is company-scoped, and only bookings use it. The marketplace/shortlist
    still deliberately have no campaign switcher and still call the global
    one; don't conflate the two when 3.1 lands real campaign CRUD.
  - **Card badge, not a Collaborations screen, for brand-side visibility.**
    `bookingsStore` mirrors `shortlistStore`'s hydrate pattern. When 4.2
    (Collaborations table) lands, it's additive, not a replacement — the
    card badge is cheap and stays useful on its own.
  - **`shots.mjs` deliberately does not exercise booking creation.** Unlike
    shortlist toggles, a booking POST is not idempotent against the
    persistent local dev DB (the app-level duplicate guard would 409 on
    every rerun after the first), so baking it into the canonical suite
    would make it non-deterministic. The rail's default/idle state (radios
    + deliverable input) is captured via the existing `modal-rail-bundle`
    shot instead; the create→accept loop was hand-verified against the
    running API (see DECISIONS.md).
  - **`CreatorHomePage`'s "Booking requests" section** lists all of the
    signed-in creator's bookings (any status), with Accept/Decline shown
    only on INVITED rows. The seed's demo creator (Emma Berg, index 0)
    happened to have no INVITED booking at screenshot time, so
    `creator-booking-requests.png` shows the populated list without the
    action buttons visible — the accept/decline transition itself was
    verified via the API, not caught in a screenshot.
- 2026-09-11 — Third pass: seed cost fix, subtitle fix, and the `/` demo entry
  (slice 6.2, pulled forward — see its PLAN entry above). For the next session:
  - **Real auth now exists end to end.** `GET /auth/me` (JWT-guarded) added
    alongside the working `POST /auth/login`. Web has `authStore` (zustand
    persist, localStorage `naano.auth`): `signIn(email, password)` does a real
    login + `/me`, `signOut()` clears it. `apps/web/src/lib/api/http.ts`
    exports `setApiToken` — call it (the store already does) before any
    authenticated request. `/app` redirects to `/` when signed out.
  - **Two real landings.** Brand → `CreatorsListPage` (marketplace). Creator →
    new `CreatorHomePage` ("your profile", their own `GET /creators/:id`). When
    Phase 4 (creator side: collaborations, earnings) lands, it likely replaces
    or extends `CreatorHomePage` rather than starting fresh — the role-aware
    routing in `App.tsx`'s `AppIndex` is the hook to extend.
  - **Seed cost.** No more `CLAMP_COST_*`. Post cost is `cpm * medianViews /
    1000`, nudged a few euros off any round-25 figure or collision
    (`usedPostCosts` module-level `Set`) — never clamped, never repeated. If a
    future tier change pushes the cheapest creator under ~€150 or the priciest
    over ~€2,500, that is the tier bands to revisit, not a clamp to re-add.
  - **`CreatorCard`'s badge and the marketplace section note both changed
    wording** this pass (sector fit label from the prior session, "All 40
    creators, ordered by…" this one) — if either drifts again, check both
    together, they read as a pair.
- 2026-09-11 — Second review pass (no new slices):
  - **`npm run shots`** (`apps/web/scripts/shots.mjs`) regenerates the whole
    marketplace suite — grid, both modal tabs, booking rail (bundle), error
    state — wiping `.screenshots/` first so every mtime is from that run. Run it
    to finish any UI task; don't hand-pick or reuse stale shots. The error shot
    aborts the API origin so the shell renders with the error panel.
  - **The card badge is "N% sector fit", not "ICP fit".** It scores
    `creator.vertical === campaign.targetVertical` — the creator's own sector
    match, nothing about their audience. The wire field is `sectorFitPct`
    (was `icpFitPct`) across `@naano/shared`, the API, and the web. Scoring in
    `audience-fit.ts` is unchanged. The marketplace subtitle already said
    "sector fit leads".
  - **LinkedIn only.** Seed no longer produces X creators or X posts (0 of
    each). `NetworkBadge` and the `Network` enum's `X` value stay for the
    schema; the seed just never emits them.
  - **44 distinct surnames**, indexed directly (no `% LAST_NAMES.length`
    wraparound), so all 40 creators have a unique surname. Avatar gender is
    still keyed on the first name (`FEMININE_NAMES`), untouched.
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
