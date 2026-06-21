# CrownBid API — production image (monorepo workspace build)
# Build context: repository root (see docker-compose.yml)

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/

RUN npm ci --workspace @crownbid/api

COPY apps/api/tsconfig.json apps/api/
COPY apps/api/src apps/api/src

RUN npm run build --workspace @crownbid/api

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/

RUN npm ci --workspace @crownbid/api --omit=dev --ignore-scripts

COPY --from=builder /app/apps/api/dist apps/api/dist

WORKDIR /app/apps/api

RUN chown -R node:node /app

EXPOSE 3000

USER node

CMD ["node", "dist/server.js"]
