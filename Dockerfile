FROM node:20-bookworm-slim AS pembangun

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml* tsconfig.json ./

RUN pnpm install --frozen-lockfile || pnpm install

COPY src ./src
RUN pnpm build
RUN pnpm prune --prod

FROM node:20-bookworm-slim AS produksi

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json banner.png* ./
COPY --from=pembangun /app/node_modules ./node_modules
COPY --from=pembangun /app/dist ./dist

RUN mkdir -p /app/data /app/temp && chown -R node:node /app

USER node

VOLUME ["/app/data", "/app/temp"]

CMD ["node", "dist/index.js"]
