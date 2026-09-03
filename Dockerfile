# Standalone Next.js server for a small VPS (or Render/Railway/Fly). Not for
# okhubtech.com's cPanel shared hosting — that host has no Node process at
# all; see docs in the main repo's docs/deployment.md for why.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
# Alpine's musl-based image ships no libssl by default; Prisma's engine
# binary links against it and mis-detects the platform without it here (and
# again in the runner stage below, where the same mismatch also showed up as
# a permission error — Prisma tried to fetch a replacement engine at
# container start and couldn't write to node_modules).
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=4100
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# `output: standalone` (next.config.ts) already traces and copies the exact
# runtime node_modules subset the app itself imports — including
# @prisma/client and its generated query engine. It does NOT include the
# `prisma` CLI, since nothing in the app code imports it (it only runs as a
# one-off command from docker-entrypoint.sh's migrate step) — and the CLI
# itself pulls in several more @prisma/* packages (engines, fetch-engine,
# get-platform, ...) beyond @prisma/client, so the whole @prisma scope is
# copied rather than hand-picking files (a first pass at this Dockerfile
# copied only node_modules/prisma + the .bin shim and it failed at
# container start with "Cannot find module '@prisma/engines'"). No
# node_modules/.bin/prisma copy: docker-entrypoint.sh runs the CLI's real
# entry point directly instead, since COPY dereferences that symlink into a
# flat file that breaks the CLI's own relative asset lookup (see the comment
# in that script).
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/docker-entrypoint.sh ./docker-entrypoint.sh

# The whole tree, not just data/: with openssl present the engine already
# copied in from the builder should just work, but Prisma's CLI falls back
# to fetching a replacement engine on any platform-detection mismatch, and a
# permission error there (write-protected node_modules under a non-root
# user) is a worse failure mode than a writable tree owned by the app's own
# user in a single-purpose container image.
RUN mkdir -p /app/data && chown -R nextjs:nodejs /app && chmod +x ./docker-entrypoint.sh

USER nextjs
EXPOSE 4100

ENTRYPOINT ["./docker-entrypoint.sh"]
