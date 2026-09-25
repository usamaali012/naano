# naano

My own B2B marketplace for LinkedIn creator sponsorships, built with
[naano.com](https://naano.com) as a reference product, not a clone. I used
the real site to ground the domain and the core loop: a brand browses a
ranked marketplace of creators, books a post or a bundle, and tracks reach
and clicks through a tracked link once the creator publishes. Past that
loop, the product decisions are mine, what to build, what to cut, and how
to make it better to use. See "What I changed" below for those calls and
the reasoning behind them.

## Live

- **Web:** https://web-production-b94cd.up.railway.app
- **API:** https://api-production-f367c.up.railway.app

Both open for a signed-out visitor. `/` offers a one-click sign-in as the
demo brand or the demo creator.

## Stack

| Layer | Choice |
|---|---|
| Backend | [NestJS](https://nestjs.com/) |
| ORM | [Prisma](https://www.prisma.io/) |
| Database | PostgreSQL |
| Frontend | React + [Vite](https://vitejs.dev/) + TypeScript |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Styling | Tailwind CSS |
| Deploy | [Railway](https://railway.app/), one Dockerfile-built service per app |

Money is stored as integer cents (EUR), never floats. Every list endpoint is
paginated. See `docs/DECISIONS.md` for the full architecture log.

## Monorepo layout

```
apps/
  api/              NestJS API: REST endpoints, Prisma, JWT auth,
                     the public tracked-link redirect (GET /r/:slug).
  web/               React + Vite SPA: the marketplace, creator modal,
                     campaign and booking flows.
packages/
  shared/            Types shared by both apps (enums, entities, the wire
                     API contracts, and the one CPM formula), derived from
                     the Prisma schema. Built with `tsc`; the API consumes
                     the built dist, the web app consumes the source
                     directly via a Vite alias.
docs/                Product research, design constraints, the build plan,
                     the architecture decision log, and this repo's file map.
scripts/
  smoke.mjs          Post-deploy smoke test, see "Verifying a deployment"
                     below.
```

`packages/shared` is the source of truth handed down from
`apps/api/prisma/schema.prisma`: the schema drives the shared types, and both
apps import from there rather than redeclaring shapes.

## Running it locally

Prerequisites: Node 20+, npm, and a PostgreSQL instance (the repo's
`docker-compose.yml` will run one for you if you don't already have one).

```bash
# 1. Install every workspace from the repo root
npm install

# 2. Copy the env template (it holds both apps' vars under one file) and
#    split/fill it into each app's own .env
cp .env.example apps/api/.env      # keep DATABASE_URL, JWT_SECRET, IP_HASH_SALT, PORT, WEB_ORIGIN
cp .env.example apps/web/.env      # keep VITE_API_URL, VITE_API_MODE

# 3. Postgres (skip if you already have one running)
docker compose up -d

# 4. Build the shared package, then migrate + seed the database
npm run build:shared
npm run prisma:migrate    # prisma migrate dev
npm run prisma:seed       # 40 creators, 2 companies, 4 campaigns, realistic figures

# 5. Run both apps together
npm run dev                # API on :3000, web on :5173
```

Each app can also be run on its own: `npm run dev:api` / `npm run dev:web`.

The web app never calls `fetch` directly. Every API call goes through
`apps/web/src/lib/api/`, which picks between a real HTTP client and a static
fixture client via `VITE_API_MODE`. That's the only place `VITE_API_URL` is
read.

## Deployment

Both services deploy to Railway from this repo's `Dockerfile`s (not
nixpacks), see `docs/DECISIONS.md`, Session B, for why, and for the
cross-stage build gotchas that cost real time getting there.

- `apps/api/Dockerfile` + `apps/api/railway.json`: multi-stage build
  (install → `prisma generate` → `nest build` → pruned runtime layer).
  Binds `0.0.0.0:$PORT`. Healthcheck: `GET /health` (no database round trip).
- `apps/web/Dockerfile` + `apps/web/Caddyfile` + `apps/web/railway.json`:
  Vite build served as a static SPA by Caddy, bound to `$PORT`.
  **`VITE_API_URL` is inlined at build time**, not read at runtime. Changing
  it requires rebuilding the web service, not just restarting it.
- Database migrations run forward-only in production: `prisma migrate
  deploy`, never `migrate reset`. The seed script (`ts-node`) only runs from
  a developer machine against the public `DATABASE_URL`, via `railway run`,
  since `ts-node` is a devDependency the production image deliberately
  doesn't install.

### Verifying a deployment

```bash
node scripts/smoke.mjs <api-base-url>
```

No setup, no dependencies beyond Node's built-in `fetch`. Checks the health
endpoint, that all 40 seeded creators are reachable, that both a seeded
brand and a seeded creator account can log in, and that the dev-only
inspection route is correctly locked down in production. Prints one
pass/fail line per check and exits non-zero on any failure.

---

## What I changed

naano.com is the reference, not the spec. Three decisions worth calling out
before the build log below.

### Next action is the spine of the creator's screen

naano has this idea already. The real Collaborations table has a "Next
action" column, sixth of six, one line per row. It's the best idea in the
product and it's buried: a creator has to know to read that column before
it tells them anything.

I made it the organizing fact instead of a footnote. `GET /bookings/received`
doesn't return a bare booking with a status pill and leave the creator to
work out what that status means for them. It returns a `nextAction` per
row: `kind` (`respond` / `publish` / `await_brand` / `none`), an imperative
`label`, and a `consequence` string that's non-empty exactly when the next
move is the creator's and empty otherwise (`DRAFT_READY`/`SCHEDULED` are the
brand's move, not the creator's, even though the booking is technically
"pending"). It's a pure function of status alone
(`apps/api/src/bookings/next-action.ts`, no Prisma, no side effects), so the
same table that used to require reading a status enum and inferring what it
means now says outright: accept or decline this; publish this, using your
tracked link; wait, this one isn't yours to move.

### The commission is real, named, and can't drift

The real product shows a creator their net and a brand its gross, and never
states the rate in between. The gap is real but invisible. I chose to make
it visible instead: a flat `COMMISSION_PCT` (20%), exported as a named
constant from `packages/shared/src/api.ts`, with an honest comment that
it's a placeholder, not naano's actual number. Nobody outside naano knows
that figure, and pretending otherwise would be worse than naming a
stand-in. Every place a creator sees a net figure (the Collaborations
list, the Earnings summary) computes it through one function, `netCents()`
in `apps/api/src/bookings/money.ts`, so the two screens can't quietly
disagree about what "net" means.

### The creator side, built from the real one, not guessed anymore

I used to write in this README that the creator side was a considered
guess. It isn't any more: I walked the real product with a fresh creator
account and wrote down exactly what's there: `docs/RECON-CREATOR.md`, ten
nav sections, section by section, including where the real product
contradicts itself or hits a dead end. Building on it meant deciding what
to keep and what to cut, and saying why out loud rather than just not
building it.

**Kept, because they're the actual job:**
- **Collaborations, built.** A creator's page organises every booking
  addressed to them around `nextAction`, not status alone: what to do next
  is the organising fact of the row, not naano's column six, and the
  creator sees their own `netCents`, not the brand's gross agreed price.
- **Earnings, built.** Four tiles, all net of commission: total earned,
  paid collaborations, average per deal, and what's in transit (accepted
  through live, not yet paid). Below them, a six-month chart of net
  earnings, drawn as a token-only inline SVG bar chart, no charting
  dependency, the same restraint as the marketplace's reach sparkline. No
  "available to withdraw" balance and no withdraw control: payment rails
  are cut, and a balance you can't withdraw is a control that does
  nothing, which this project's own standing rule already forbids.
- **The creator's own profile**: what a brand sees when they look at this
  creator, audience breakdown, recent posts, pricing. Already built before
  this recon. The real product has this too, as My card ("Your creator
  storefront" per `docs/RECON-CREATOR.md`), and I kept the storefront half
  of it. The referral pitch stacked on top of it is the part that didn't
  survive, see below.

**Cut, and here's why a creator wouldn't miss any of it:**
- **My card's referral half**: "put it on LinkedIn, earn when a brand
  joins" is a growth mechanic for naano, not a tool for the creator's own
  deals. The storefront view survives; the affiliate pitch on top of it
  doesn't.
- **Opportunities**: in the real product this is gated behind 1,000
  followers with no way through for a creator who doesn't have them, ever.
  RECON-CREATOR calls this out directly: it's a dead end, not a feature,
  for exactly the account that would be looking at it. I didn't rebuild a
  dead end.
- **Boosts**: marked **Pilot** in the real product itself. A second
  transaction type, not the core loop.
- **Analytics** (the LinkedIn-import tab): imported public post
  performance that, on a fresh account, is mostly a banner saying the
  import hasn't finished yet. The recent-posts data it would show already
  lives on the creator's profile.
- **Community and Affiliate program**: both are naano's own growth
  surfaces, not the creator's work. RECON-CREATOR even catches the real
  product contradicting itself between them (25% for "3 months" in one
  place, "6 months" in another), a sign these were never load-bearing for
  the creator in the first place.
- **Messages**: already on this project's standing cut list; a real
  brand-to-creator thread system is out of scope for a demo this size.

Ten nav items become three real destinations, and the product now shows
exactly that: a signed-in creator's rail carries three icons, Profile,
Collaborations, Earnings, the same 72px shape as the brand's own
three-item rail, ordered by what the creator came to do rather than by
what naano wants to grow. That is RECON-CREATOR's own second complaint
about the real product's nav, resolved by not repeating it.

The rail wasn't always there for creators. Earlier in this build, a
creator had exactly one real screen, their own profile, so the rail was
removed entirely rather than ship it holding a single permanently-active
icon: navigation with one destination is decoration wearing navigation's
clothes. That call was correct for the product as it stood then. It
stopped being correct the moment Earnings gave creators a second and
third destination, so the rail came back, not because the earlier
decision was wrong, but because the product underneath it had changed.

## What shipped first

The core loop, end to end, before anything else:

1. **Data truth.** 40 seeded creators with realistic figures (followers,
   median views, CPM, post cost, audience breakdown, five recent posts
   each) driven by `docs/RECON.md`'s calibration targets, not lorem ipsum.
2. **The marketplace.** A ranked grid, sector fit first, verified
   performance second, with a real search box (matching name, headline,
   and vertical), four sort modes, and filters (industry multi-select,
   country, follower range) that hide creators against live `GET /creators`
   query params, not client-side fakes.
3. **The creator profile modal.** Audience composition, content
   performance (a pageable post history: full text, engagement, the
   original link), and a booking rail with live pricing (single post vs.
   bundle of five) and the literal CPM formula.
4. **Real two-sided bookings.** A brand books a creator; the creator
   accepts or declines from their own real sign-in; accepting mints a
   `TrackedLink` and surfaces it to the creator with a copy button.
5. **Real click tracking.** `GET /r/:slug` records every click and 302s to
   the campaign's destination; a brand sees the running click count on
   the creator's card and in the Collaborations table.
6. **Collaborations.** The brand-side table of every booking: creator,
   campaign, package, price, status, tracked link and its click count,
   with a status filter and pagination.
7. **A seeded, role-aware demo entry (`/`).** One click signs a visitor in
   as the demo brand or the demo creator; each lands on the surface that
   role actually sees (marketplace + Collaborations for a brand, their own
   profile and bookings for a creator).
8. **Deployed.** Both services run on Railway from this repo's
   Dockerfiles, see "Deployment" above.

Then, once the loop was closed, one more screen: **attribution by
creator.** Results aggregates real `ClickEvent` rows into clicks per
creator, alongside accepted-booking counts and the time of the last click.
Server-side aggregates, paginated like every other list, no charting
dependency. It exists because the entry page promises "trace every click"
and nothing else in the product paid that off as a screen you could open.

## What was deliberately cut

Named out loud rather than left to be discovered. (The creator-side cuts,
My card's referral pitch, Opportunities, Boosts, Analytics, Community,
Affiliate program, are covered above, under "What I changed," with the
reasoning specific to each. This list is everything else.)

- The agency side of the marketplace entirely.
- Real payment rails. A wallet UI may exist, but balances are never real
  money moving.
- The AI Matching conversational mode; the marketplace stays a browsable,
  filterable grid.
- The conversion pixel (a layer above click tracking). Click tracking
  itself is real and verified end to end.
- LinkedIn OAuth and any real LinkedIn API. Post URLs and content are
  seeded, not fetched.
- Messages between brands and creators.
- The Leads tab and ICP account enrichment.
- The MCP / Connect server.
- i18n, the blog, and the SEO page tree.
- The rest of the analytics dashboard: metric cards and a daily-clicks
  time series. Attribution by creator shipped because it closes the
  tracked-link loop; charts drawn over data I seeded myself would only
  have proved that I can draw a chart.
- The floating AI command bar seen on the live product, left out rather
  than shipped as a non-functional signature element.

The standing rule behind all of it: a control that renders but doesn't do
anything is worse than no control. Everything above either doesn't render,
or wasn't started.

## What is not finished, honestly

**Sector fit is narrower than it looks.** The badge scores the creator's
own vertical against the campaign's target vertical. It is not derived
from the audience industry mix shown on the Audience tab, so the two can
disagree for the same creator. Deriving fit from audience composition is
the more honest version and I did not have time for it.

**Campaign context is implicit.** The marketplace ranks against the
company's most recent live campaign. There is no campaign switcher,
because there are no campaign screens.

**Tracked-link destinations are `example.com` paths.** The redirect and
the click recording are real and verified end to end. The page a link
lands on is a placeholder, because the plumbing was the point.

**There are no tests.** In a build this short I chose hand-verification, a
Playwright screenshot suite that regenerates on every change, and a smoke
script that runs against the deployed API. That is a real tradeoff, not an
oversight, and it is the first thing I would add.

## Disclosures

### Agent logs

This repo was built with AI coding agents (Claude Code; see `AGENTS.md` for
the full working convention) rather than typed by hand end to end. Every
session's prompts and responses are captured automatically under
`.agent-logs/`, one append-only file per session
(`YYYY-MM-DD_HH-MM-SS_<session-id>.md`), so the full history of what was
asked for and what was built in response is auditable rather than
summarized after the fact. `docs/DECISIONS.md`'s running log and
`docs/PLAN.md`'s per-slice notes are the human-readable index into that
history. They cite the reasoning; the `.agent-logs/` transcripts are the
record it was derived from.

### The demo password is in the repo on purpose

Every seeded account shares one password, hardcoded in
`apps/web/src/routes/EntryPage.tsx`, so a reviewer can sign in as either
side without being handed credentials. That is the right call for a seeded
demo and the wrong call for anything real.

### The logs cover implementation, not everything

Planning, research, review of my own output and the merge coordination
between parallel sessions happened in a separate Claude conversation that
this hook does not capture. `.agent-logs/` is an honest record of what was
built, not of everything that was thought.

### Some early sessions are backfilled

The scaffold was built before I opened the brief. Those sessions were
reconstructed from on-disk transcripts after the fact and are marked
`backfilled: true`. Everything from the brief onward was captured live by
the hook as it happened.
