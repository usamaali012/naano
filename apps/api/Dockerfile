# syntax=docker/dockerfile:1
#
# API image. Build context = REPO ROOT (needs the lockfile + packages/shared).
#
# Single build stage, install-after-source. npm workspace symlinks
# (node_modules/@naano/shared) and `prisma generate`'s output
# (node_modules/.prisma/client) are position- and content-dependent: an
# earlier version of this file ran `npm ci` in its own `deps` stage (source
# not yet present) and copied that node_modules into the `build` stage,
# which broke both — TS2307 on @naano/shared and stub/ungenerated Prisma
# types at compile time. `npm ci` now runs in the SAME stage as the real
# source, after the source is present.
#
#   - Confirmed by inspection (a probe build with `ls`/`find` on the actual
#     paths, not assumed): npm workspaces hoist everything to the ROOT
#     node_modules — `apps/api/node_modules` never exists. Both the
#     generated Prisma client and the @naano/shared symlink live at
#     /app/node_modules, which is what the runner stage copies from below.
#   - Runtime has no devDependencies, so the seed CANNOT run in this image.
#     Seed is run from a developer machine via `railway run` (see docs/DECISIONS.md,
#     Session B). `prisma migrate deploy` is run the same way.

# ---- build: full install (with real source present) -> shared -> prisma generate -> nest build ----
FROM node:20-alpine AS build
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api ./apps/api
COPY apps/web/package.json apps/web/package.json
COPY packages/shared ./packages/shared
RUN npm ci
RUN npm run build --workspace=packages/shared
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
# Fail loudly here instead of letting a missing/stub client surface later as
# a confusing TS2307 / "no exported member" error during nest build.
RUN test -f node_modules/.prisma/client/index.js || \
    (echo "ERROR: Prisma client was not generated at node_modules/.prisma/client" && exit 1)
RUN npm run build --workspace=apps/api

# ---- prod-deps: runtime dependencies only, fresh install in its own stage ----
FROM node:20-alpine AS prod-deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci --omit=dev

# ---- runner ----
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
# Generated Prisma client + engine (base image matches the build stage).
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client ./node_modules/@prisma/client
# Compiled workspace output. The @naano/shared symlink was recreated by
# `npm ci --omit=dev` above (pointing at ./packages/shared); drop its dist +
# manifest in behind it.
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
# Informational only; the app binds process.env.PORT, which Railway injects.
EXPOSE 3000
CMD ["node", "dist/main.js"]
