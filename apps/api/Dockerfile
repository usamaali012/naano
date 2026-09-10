# syntax=docker/dockerfile:1
#
# API image. Build context = REPO ROOT (needs the lockfile + packages/shared).
# Multi-stage: full install to build, then a pruned runtime layer.
#
#   - Prisma client is generated in `build` and copied into the runtime layer.
#     Both stages share the same node:20-alpine base, so the musl query-engine
#     binary matches.
#   - Runtime has no devDependencies, so the seed CANNOT run in this image.
#     Seed is run from a developer machine via `railway run` (see docs/DECISIONS.md,
#     Session B). `prisma migrate deploy` is run the same way.

# ---- deps: full install (incl. dev) so nest build / prisma / tsc are present ----
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci

# ---- build: shared -> prisma generate -> nest build ----
FROM node:20-alpine AS build
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build --workspace=packages/shared
RUN npx prisma generate --schema apps/api/prisma/schema.prisma
RUN npm run build --workspace=apps/api

# ---- prod-deps: runtime dependencies only ----
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
# `npm ci --omit=dev` above; drop its dist + manifest in behind it.
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
# Informational only; the app binds process.env.PORT, which Railway injects.
EXPOSE 3000
CMD ["node", "dist/main.js"]
