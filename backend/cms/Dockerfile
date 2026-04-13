# ─── Development ──────────────────────────────────────────────────────────────
# Used by docker-compose for local development with hot reload.
# node_modules are installed inside the image so Linux binaries are used
# (avoids Windows/Linux ABI incompatibilities when bind-mounting the source).
FROM node:20 AS development

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

# Pre-build the admin panel to avoid esbuild deadlock on Windows Docker bind mounts
RUN npm run build

EXPOSE 1337

# Disable admin watcher in development to avoid esbuild deadlock on Windows
ENV STRAPI_ADMIN_WATCHER_DISABLE=true

CMD ["npm", "run", "develop"]

# ─── Builder ───────────────────────────────────────────────────────────────────
# Compiles TypeScript and builds the admin panel.
FROM node:20 AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

RUN npm run build

# ─── Production ────────────────────────────────────────────────────────────────
# Minimal image with only production dependencies and build artifacts.
FROM node:20 AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json* ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/.strapi ./.strapi
COPY --from=builder /app/public ./public
COPY --from=builder /app/favicon.png ./

EXPOSE 1337

CMD ["npm", "run", "start"]
