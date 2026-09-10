# syntax=docker/dockerfile:1
#
# Web image. Build context = REPO ROOT. Static SPA built by Vite, served by Caddy.
#
# CRITICAL: Vite inlines VITE_* vars at BUILD time. They arrive as Docker build
# args (Railway passes service variables as build args). If VITE_API_URL ever
# changes, this image MUST be rebuilt — a restart/redeploy keeps the old baked-in
# value. See docs/DECISIONS.md, Session B.
#
# Single stage, install-after-source (same fix as apps/api/Dockerfile): the
# @naano/shared workspace symlink is position/content-dependent on npm ci
# running with the real source already in place, not just its package.json.

FROM node:20-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web ./apps/web
COPY packages/shared ./packages/shared
RUN npm ci
RUN npm run build --workspace=packages/shared

ARG VITE_API_URL
ARG VITE_API_MODE=http
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_API_MODE=$VITE_API_MODE
# Fail loudly rather than bake in the localhost fallback from lib/api/http.ts.
RUN test -n "$VITE_API_URL" || (echo "ERROR: VITE_API_URL build arg is required" && exit 1)
RUN npm run build --workspace=apps/web

# ---- runner: static file server ----
FROM caddy:2-alpine AS runner
COPY apps/web/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /app/apps/web/dist /usr/share/caddy
# Caddy listens on process.env.PORT (see Caddyfile); Railway injects it.
EXPOSE 80
