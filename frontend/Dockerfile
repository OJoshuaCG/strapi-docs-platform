# ─── Builder stage ───────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Inject build-time env vars (VITE_ prefix makes them available in the bundle)
ARG VITE_STRAPI_URL=http://strapi:1337
ENV VITE_STRAPI_URL=${VITE_STRAPI_URL}

RUN npm run build

# ─── Production stage ────────────────────────────────────────────────────────
FROM node:22-alpine AS production

WORKDIR /app

# Only copy what the Node adapter needs to run
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev

EXPOSE 3000

# adapter-node writes the output to build/index.js
CMD ["node", "build"]
