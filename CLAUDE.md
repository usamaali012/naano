# Project context

Rebuilding naano.com (B2B LinkedIn creator marketplace) as a working product.
This is a timed build. Optimise for a narrow vertical slice that fully works over
a broad one that half works.

## Read this before doing anything

- `docs/PRODUCT.md` — what naano is, the core loop, the data that matters.
  Domain reference. Read once, never re-fetch naano.com.
- `docs/RECON.md` — the live product, observed directly. Supersedes PRODUCT.md.
- `docs/DESIGN.md` — visual constraints. Read before writing any component.
- `docs/PLAN.md` — the running build checklist. Read at the start of every
  session, tick items as they are finished.
- `docs/DECISIONS.md` — stack, architecture, and the running log of choices made.
  Read before proposing anything structural.
- `docs/MAP.md` — file tree and what each area owns. Read this INSTEAD of
  globbing or listing the repo.
- `docs/BRIEF.md` — the actual assignment text. Authoritative. If it contradicts
  anything in these docs, the brief wins and you must say so out loud.

## Rules for agents working in this repo

1. **Do not explore to rebuild context.** `docs/MAP.md` tells you where things
   are. If the map is wrong or stale, fix the map as part of your change.
2. **Append, don't re-derive.** When you make a structural decision, add one line
   to `docs/DECISIONS.md` under the running log. Next session reads it instead of
   inferring from code.
3. **One task per session.** Do not refactor adjacent code you were not asked to
   touch. Time is the constraint, not elegance.
4. **Ask before adding a dependency.** Every package is a decision the human owns.
5. **No placeholder features.** A button that does nothing is worse than no
   button. If it renders, it works.
6. **Every component follows `docs/DESIGN.md`.** Tokens are defined once as CSS
   custom properties. No colour, radius or spacing value is hardcoded in a
   component. After building any screen, screenshot it and check it against the
   anti-slop rules before moving on.
7. **`docs/PLAN.md` is the handoff.** Each session starts by reading it and ends
   by ticking what was finished and adding anything discovered. It is how a new
   session with empty context knows where the build is.

## Stack

Backend: NestJS + Prisma + PostgreSQL
Frontend: React + Vite + TypeScript + Zustand + Tailwind
Monorepo: `apps/api`, `apps/web`, `packages/shared` for shared types.

## The hedge

The brief may turn out to ask for frontend only. Every API call on the web side
goes through `apps/web/src/lib/api/` and nothing else. Swapping the real client
for the fixture client is one file. Do not scatter `fetch` calls through
components.

## Conventions

- Shared types live in `packages/shared` and are imported by both apps. Prisma
  types are the source of truth; shared types derive from them.
- Money is stored in integer cents, never floats. Currency is EUR.
- Every list endpoint is paginated from day one. Retrofitting pagination costs
  more than adding it.
- Seed data must be realistic. Use the figures in `docs/PRODUCT.md`, not
  lorem ipsum. A demo with believable numbers reads as finished.
