# ===============================================================
# Multi-stage production Dockerfile for Travel Blueprint (Next.js)
# ===============================================================
#
# Stages:
#   1. deps      — install ALL npm dependencies
#   2. builder   — generate Prisma client + run Next.js build
#   3. runner    — copy only the standalone output (minimal image)
#
# Required env vars at runtime (pass via -e or docker-compose):
#   DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL,
#   B2_KEY_ID, B2_APPLICATION_KEY, B2_BUCKET_NAME,
#   B2_ENDPOINT, B2_REGION
# ===============================================================

# ── Stage 1: Install dependencies ──────────────────────────────
FROM node:20-alpine AS deps

# Install libc compat for Alpine + OpenSSL for Prisma
RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Copy package manifests first to leverage Docker layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including devDeps needed for build)
RUN npm ci


# ── Stage 2: Build the application ─────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Bring in installed node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy the full source
COPY . .

# Generate Prisma client from the schema
# DATABASE_URL is not needed at generate time — only schema is read
RUN npx prisma generate

# Build Next.js (output: standalone is set in next.config.ts)
# Disable telemetry during CI/CD builds
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build


# ── Stage 3: Production runtime ────────────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

# Run as a non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser  --system --uid 1001 nextjs

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Copy the standalone Next.js server (includes its own node_modules)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./

# Copy static assets (CSS, JS bundles, images)
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy the public directory (favicon, OG images, etc.)
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Prisma client files are bundled inside .next/standalone/node_modules
# but we also copy the schema + migrations so migrations can run at startup
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts

USER nextjs

EXPOSE 3000

# Start the Next.js production server
# The standalone server.js listens on PORT + HOSTNAME
CMD ["node", "server.js"]
