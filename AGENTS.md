# AGENTS.md

This repo keeps one canonical set of context files. Do not duplicate them.

Read, in order:

1. `CLAUDE.md` — project rules, stack, conventions. Applies to every agent
   working here, not only Claude Code.
2. `docs/PRODUCT.md` — what the product is.
3. `docs/DECISIONS.md` — architecture and the running decision log.
4. `docs/MAP.md` — file tree. Read this instead of globbing.
5. `docs/BRIEF.md` — the assignment. Authoritative over everything above.

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
