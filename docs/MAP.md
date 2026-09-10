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
                           country, price range, max CPM, min median views,
                           min/max followers, min engagement %, posted-within-
                           days) and four sorts (best_match default, price_asc,
                           followers_desc, engagement_desc). GET /creators/:id
                           returns the profile + audienceSegments + posts
                           (CreatorProfileDetail). Filter/sort DTO in
                           dto/list-creators.dto.ts. CPM comes from
                           @naano/shared cpm.ts, never stored. ranking.ts holds
                           the best_match blend (verified-performance only until
                           campaigns carry a target vertical). audience-fit.ts
                           holds the single swappable sector-fit rule;
                           CreatorsService.audienceFitScore() wraps it, still
                           uncalled. List filter/sort/page happen in memory over
                           the ~40-row catalogue after one cheap DB where.
      campaigns/          Empty, wired stub module. No routes yet.
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
    src/
      index.css           The design token layer: colour, two radii, one overlay
                           shadow, type ramp, Inter stack -- defined once here
                           per docs/DESIGN.md. Single source of truth.
      lib/
        api/              ALL http lives here. Two impls: http + fixtures,
                           selected by VITE_API_MODE. client.ts has the interface.
        stores/           Zustand stores, one per domain (uiStore.ts is the
                           pattern example: sidebar collapse state).
                           creatorsStore.ts holds the creators-grid page state.
        format.ts         Money/number formatting helpers. Render-boundary only.
      routes/             PublicHome (public), AppShell (authed-feeling chrome)
                           wrapping CreatorsListPage (the working creators list).
      components/
        ui/               Token-only primitives: Button, Card, Input, Select,
                           Checkbox, Badge, StatusPill, Table (+ THead/TBody/TR/
                           TH/TD), Tabs, Modal, SegmentedBar. None hardcode a
                           colour, radius or spacing value.
        marketplace/      CreatorCard, CreatorGrid, CreatorsPagination
                           (Prev/Next + range, driven by the list envelope).
                           No filter panel yet -- out of scope this session.
        campaign/         Empty. Brief form, campaign list, status pills land
                           with the campaign flow.
        dashboard/        Empty. Metric tiles, charts land with the dashboard.
packages/
  shared/                 Wire-safe types (enums.ts, entities.ts, api.ts) hand-kept
                           in sync with prisma/schema.prisma. Imported by both apps.
                           cpm.ts: the one CPM formula (postCostCents / medianViews
                           * 1000), used by API and web so the number never
                           disagrees. Run `npm run build:shared` after editing.
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
