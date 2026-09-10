# AGENTS.md

This repo keeps one canonical set of context files. Do not duplicate them.

Read, in order:

1. `CLAUDE.md` — project rules, stack, conventions. Applies to every agent
   working here, not only Claude Code.
2. `docs/PRODUCT.md` — what the product is.
3. `docs/RECON.md` — the live product, observed directly. Supersedes PRODUCT.md.
4. `docs/DESIGN.md` — visual constraints. Read before writing any component.
5. `docs/PLAN.md` — the running build checklist. Read at the start of every
   session, tick items as they are finished.
6. `docs/DECISIONS.md` — architecture and the running decision log.
7. `docs/MAP.md` — file tree. Read this instead of globbing.
8. `docs/BRIEF.md` — the assignment. Authoritative over everything above.

## Rules for agents working in this repo

These mirror the numbered rules in `CLAUDE.md`; the two files stay in sync.

1. **Do not explore to rebuild context.** `docs/MAP.md` tells you where things
   are. If the map is wrong or stale, fix the map as part of your change.
2. **Append, don't re-derive.** When you make a structural decision, add one line
   to `docs/DECISIONS.md` under the running log.
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

## Working alongside another agent

Two tools are being used on this repo (Claude Code and Antigravity). To avoid
one undoing the other's work:

- Before starting, read the running log at the bottom of `docs/DECISIONS.md`.
  It is the handoff point between sessions and between tools.
- After any structural change, append one line to that log. Say what changed and
  why, not how.
- Stay inside the area you were asked to work on. `docs/MAP.md` says who owns
  what. Do not refactor another area to suit yours without saying so.
- If you find code that contradicts `docs/DECISIONS.md`, do not silently
  "fix" either one. Say which is stale and ask.
