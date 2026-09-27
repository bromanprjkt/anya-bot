FROM node:20-bookworm-slim AS pembangun

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml tsconfig.json ./

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm approve-builds --all

COPY src ./src
RUN pnpm build

FROM node:20-bookworm-slim AS produksi

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod
RUN pnpm approve-builds --all
COPY --from=pembangun /app/dist ./dist
RUN mkdir -p /app/data /app/temp && chown -R node:node /app
USER node
VOLUME ["/app/data", "/app/temp"]
CMD ["node", "dist/index.js"]
