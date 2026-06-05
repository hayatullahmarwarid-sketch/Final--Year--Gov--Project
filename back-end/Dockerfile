# syntax=docker/dockerfile:1.7

# =============================================================================
# Stage 1: dependencies (production-only)
# =============================================================================
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# =============================================================================
# Stage 2: runtime
# =============================================================================
FROM node:20-alpine AS runtime
RUN apk add --no-cache tini curl
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    NODE_OPTIONS=--enable-source-maps

# Non-root user with stable UID for predictable volume permissions.
RUN addgroup -g 10001 -S app && adduser -S -G app -u 10001 app

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=app:app package.json package-lock.json ./
COPY --chown=app:app src ./src
COPY --chown=app:app database ./database
COPY --chown=app:app scripts ./scripts
COPY --chown=app:app api ./api

# Writable uploads dir (only relevant when STORAGE_PROVIDER=disk).
RUN mkdir -p /app/uploads && chown -R app:app /app/uploads

USER app
EXPOSE 4000

# Liveness probe — the container orchestrator (compose/k8s) can rely on /health.
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD curl -fsS http://127.0.0.1:${PORT}/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server.js"]
