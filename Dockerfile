FROM node:20-bookworm-slim AS pembangun

# Pasang dependensi sistem yang dibutuhkan untuk kompilasi dan media
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Aktifkan pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Salin berkas definisi dependensi
COPY package.json pnpm-lock.yaml tsconfig.json ./

# Pasang dependensi
RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm approve-builds --all

# Salin kode sumber
COPY src ./src

# Bangun aplikasi ke direktori dist
RUN pnpm build

# Tahap Produksi
FROM node:20-bookworm-slim AS produksi

# Pasang ffmpeg untuk pemrosesan video dan stiker animasi
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# Pasang dependensi produksi saja
RUN pnpm install --prod
RUN pnpm approve-builds --all

# Salin hasil kompilasi dari tahap pembangun
COPY --from=pembangun /app/dist ./dist

# Siapkan direktori penyimpanan dengan hak akses pengguna non-root (node)
RUN mkdir -p /app/data /app/temp && chown -R node:node /app

USER node

VOLUME ["/app/data", "/app/temp"]

CMD ["node", "dist/index.js"]
