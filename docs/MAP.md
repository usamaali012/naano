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
      schema.prisma       Source of truth for the data model
      seed.ts             Realistic seed data. Figures come from docs/PRODUCT.md
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
      creators/           GET /creators (paginated list) is real and hits Postgres.
                           No filter/detail yet -- those wait for the brief.
                           audience-fit.ts holds the single swappable scoring
                           rule; CreatorsService.audienceFitScore() wraps it.
                           Nothing calls it yet.
      campaigns/          Empty, wired stub module. No routes yet.
      bookings/           Empty, wired stub module. No routes yet.
      tracking/           GET /r/:slug -> record ClickEvent -> 302. The spine.
                           Fully working, verified end to end.
                           dev-tracked-links.controller.ts adds a dev-only
                           GET /dev/tracked-links (slug/campaign/creator/dest),
                           guarded off in production.
      analytics/          Empty, wired stub module. No routes yet.
  web/                    React + Vite
    src/
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
        ui/               Primitives (button, card, input, badge)
        marketplace/      CreatorCard, CreatorGrid, CreatorsPagination
                           (Prev/Next + range, driven by the list envelope).
                           No filter panel yet -- out of scope this session.
        campaign/         Empty. Brief form, campaign list, status pills land
                           with the campaign flow.
        dashboard/        Empty. Metric tiles, charts land with the dashboard.
packages/
  shared/                 Wire-safe types (enums.ts, entities.ts, api.ts) hand-kept
                           in sync with prisma/schema.prisma. Imported by both apps.
docs/
  PRODUCT.md              Domain reference
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
