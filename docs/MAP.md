# MAP.md

Read this instead of listing or globbing the repo. Keep it current: if you add a
directory that another session would need to find, add the line here in the same
change.

```
docker-compose.yml        Postgres for local dev (not needed if you already run
                           Postgres elsewhere, as this session does)
.env.example               Root-level template. Real .env files live in
                           apps/api/ and apps/web/, gitignored.
apps/
  api/                    NestJS
    prisma/
      schema.prisma       Source of truth for the data model. Reflects the
                           docs/RECON.md §10 delta (medianViews, postCostCents +
                           bundle5PriceCents, network, Icp, AudienceSegment,
                           CreatorPost, Booking.initiatedBy, observedEngagerCount,
                           postsAnalyzed). CPM is never a column.
      seed.ts             Realistic seed data. Figures + volume/calibration
                           targets come from docs/RECON.md §10-12
    src/
      main.ts
      app.module.ts
      prisma/             PrismaService, global module
      common/             Cross-cutting bits: non-production.guard.ts (404s a
                           route when NODE_ENV=production) and
                           dto/pagination-query.dto.ts (page/pageSize, the base
                           every list DTO extends).
      auth/               JWT strategy/guards/role decorator + POST /auth/login.
                           Working, not stubbed: needed to exercise the role guard.
      creators/           GET /creators (paginated) with filters (vertical x N,
                           country, q free-text, price range, max CPM, min median
                           views, min/max followers, min engagement %, posted-
                           within-days) and four sorts (best_match default,
                           price_asc, followers_desc, engagement_desc). Optional
                           campaignId sets the ranking context; rows return as
                           MarketplaceCreator (CreatorProfile + icpFitPct).
                           GET /creators/:id returns profile + audienceSegments
                           + posts (CreatorProfileDetail). Filter/sort DTO in
                           dto/list-creators.dto.ts. CPM from @naano/shared
                           cpm.ts, never stored. ranking.ts: best_match is
                           fit-band-first then a rank-normalised performance
                           blend within the band (CPM .5 / views .3 / eng .2);
                           takes an optional fitById map. audience-fit.ts holds
                           the swappable sector-fit rule and is now called by
                           list() (via scoreAudienceFit) and by
                           CreatorsService.audienceFitScore(). Filter/sort/page
                           in memory over the ~40-row catalogue after one DB where.
      campaigns/          Empty, wired stub module. No routes yet. Campaign now
                           carries targetVertical (drives ICP fit + ranking).
      bookings/           Empty, wired stub module. No routes yet.
      tracking/           GET /r/:slug -> record ClickEvent -> 302. The spine.
                           Fully working, verified end to end.
                           dev-tracked-links.controller.ts adds a dev-only
                           GET /dev/tracked-links (slug/campaign/creator/dest),
                           guarded off in production.
      analytics/          Empty, wired stub module. No routes yet.
  web/                    React + Vite
    scripts/
      shot.mjs            Playwright screenshot tool. `npm run shot
                           --workspace=apps/web -- <route> [name]` -> 1440px PNG
                           in apps/web/.screenshots/ (gitignored). Dev server
                           must be up. From Git-Bash prefix MSYS_NO_PATHCONV=1.
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
                           listCreators(ListCreatorsParams) -> MarketplaceCreator
                           page, getCreator(id) -> CreatorProfileDetail. http.ts
                           maps every list param (filter params wired, not yet
                           surfaced in UI). fixtures.ts mirrors both.
        stores/           Zustand stores, one per domain. creatorsStore.ts:
                           grid page/sort/q/tab state. shortlistStore.ts: saved
                           creator ids, zustand persist -> localStorage
                           (naano.shortlist). uiStore.ts: unused pattern example.
        format.ts         Money/number/percent + verticalLabel helpers.
                           Render-boundary only; formatCpm uses @naano/shared.
      routes/             PublicHome (public). AppShell = the 72px icon rail
                           (DESIGN §layout), only Creators routes. CreatorsListPage
                           wires header + grid + pagination + profile modal +
                           multi-select + shortlist.
      components/
        ui/               Token-only primitives: Button, Card, Input, Select,
                           Checkbox, Badge, StatusPill, Table (+ THead/TBody/TR/
                           TH/TD), Tabs, Modal, SegmentedBar. None hardcode a
                           colour, radius or spacing value.
        marketplace/      MarketplaceHeader (title/explainer, All+Shortlist tabs
                           with counts, search, sort-by, section header).
                           CreatorCard (checkbox, network badge, ICP fit badge,
                           star, Book, 4-metric strip, View profile). CreatorGrid
                           (3/2/1 cols). CreatorsPagination (Prev/Next + range).
                           CreatorProfileModal (thin real profile from
                           GET /creators/:id; grows into the 2.9 tabbed modal).
                           icons.tsx (NetworkBadge, StarIcon). No filter panel yet.
        campaign/         Empty. Brief form, campaign list, status pills land
                           with the campaign flow.
        dashboard/        Empty. Metric tiles, charts land with the dashboard.
packages/
  shared/                 Wire-safe types (enums.ts, entities.ts, api.ts) hand-kept
                           in sync with prisma/schema.prisma. Imported by both apps.
                           api.ts adds MarketplaceCreator + campaignId/q on
                           ListCreatorsParams. cpm.ts: the one CPM formula
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
- Booking status change → `apps/api/src/bookings/` state machine, and the pill
  component in `components/campaign/`
- Anything touching the data model → `prisma/schema.prisma` first, then
  `packages/shared`, then consumers
