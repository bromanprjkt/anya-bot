# Anya Bot

> Public WhatsApp Group Media & Moderation Bot

Anya Bot adalah bot WhatsApp grup publik yang berfokus pada stiker, pemrosesan media, peralatan grup, moderasi, serta pengunduh media eksternal yang modular dan tangguh.

---

## 1. Fitur Utama

- **Stiker & Media**: Pembuatan stiker gambar, stiker animasi (video/GIF) via FFmpeg & Sharp, ekstraksi stiker ke gambar (`!toimg`).
- **Peralatan Grup**: Mention semua member (`!tagall`), info grup (`!groupinfo`), daftar admin (`!admins`), pesan sambutan (`!welcome`) dan perpisahan (`!goodbye`).
- **Moderasi**: Anti-link dengan pengecualian domain, anti-spam berbasis rate limiting, sistem peringatan (`!warn`, `!warnings`).
- **Job Queue & Concurrency**: Pemrosesan media aman dari beban berlebih menggunakan antrean kerja.
- **Pengunduh Modular**: Adapter fleksibel menuju API scraper eksternal (TikTok, Instagram).

---

## 2. Persyaratan Sistem

- Node.js LTS (v20+)
- pnpm (v9+)
- FFmpeg (untuk konversi video/audio/stiker animasi)
- SQLite3
- Docker & Docker Compose (opsional untuk deployment kontainer)

---

## 3. Instalasi

1. Klon repositori:
   ```bash
   git clone <repo-url>
   cd anya-bot
   ```

2. Pasang dependensi:
   ```bash
   pnpm install
   ```

3. Siapkan berkas konfigurasi lingkungan:
   ```bash
   cp .env.example .env
   ```

---

## 4. Konfigurasi Variabel Lingkungan

| Variabel | Deskripsi | Bawaan |
|---|---|---|
| `NODE_ENV` | Lingkungan aplikasi (`development`, `production`, `test`) | `development` |
| `LOG_LEVEL` | Tingkat log Pino (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) | `info` |
| `BOT_PREFIX` | Awalan perintah bot WhatsApp | `!` |
| `BOT_OWNER_ID` | JID WhatsApp pemilik bot (misal: `628xxx@s.whatsapp.net`) | - |
| `DATABASE_PATH` | Jalur penyimpanan basis data SQLite | `./data/anya.db` |
| `TEMP_DIRECTORY` | Direktori berkas sementara | `./temp` |
| `SESSION_NAME` | Nama folder/kunci sesi autentikasi Baileys | `anya-session` |
| `MAX_CONCURRENT_MEDIA_JOBS` | Batas maksimum pemrosesan media secara simultan | `2` |
| `DOWNLOADER_API_URL` | URL API scraper pengunduh media eksternal | - |
| `DOWNLOADER_API_KEY` | Kunci otentikasi API scraper eksternal | - |

---

## 5. Pengembangan (Development)

- Menjalankan bot dalam mode pengawasan langsung (hot-reload):
  ```bash
  pnpm dev
  ```
- Memeriksa kesesuaian tipe data TypeScript:
  ```bash
  pnpm typecheck
  ```
- Menjalankan suite pengujian:
  ```bash
  pnpm test
  ```
- Membangun kode untuk produksi:
  ```bash
  pnpm build
  ```
- Menjalankan kode produksi:
  ```bash
  pnpm start
  ```

---

## 6. Autentikasi WhatsApp

Bot menggunakan Baileys untuk koneksi ke WhatsApp Web socket. Pada peluncuran awal:
- QR code atau kode pairing akan dicetak pada terminal/log.
- Sesi disimpan secara aman di direktori lokal atau persistent volume container.

---

## 7. Menjalankan dengan Docker

```bash
docker compose up -d
```
Berkas data SQLite dan sesi autentikasi akan tersimpan persisten di `./data`.

---

## 8. Struktur Proyek

```text
anya-bot/
├── src/
│   ├── app.ts                  # Kelas daur hidup aplikasi utama
│   ├── index.ts                # Titik masuk proses (bootstrap)
│   ├── config/                 # Konfigurasi lingkungan & nilai bawaan
│   ├── whatsapp/               # Koneksi Baileys & penanganan event
│   ├── core/                   # Router perintah, registry, rate limiter, & perizinan
│   ├── commands/               # Definisi perintah (general, media, group, moderasi)
│   ├── services/               # Layanan bisnis (media, antrean, downloader)
│   ├── repositories/           # Pengelolaan data SQLite
│   ├── utils/                  # Utilitas logger, pembersih file, dsb.
│   └── types/                  # Definisi tipe data & antarmuka
├── tests/                      # Suite pengujian Vitest
├── data/                       # Penyimpanan database persisten
├── temp/                       # Direktori kerja file sementara
├── Dockerfile
├── compose.yaml
├── .env.example
├── tsconfig.json
└── package.json
```

---

## 9. Menambahkan Perintah Baru

1. Buat berkas perintah pada kategori terkait di dalam `src/commands/`.
2. Implementasikan antarmuka `PerintahBot`.
3. Daftarkan perintah ke `RegistriPerintah`.

---

## 10. Menambahkan Penyedia Pengunduh

Implementasikan kontrak antarmuka `PenyediaPengunduh` pada `src/services/downloader/` untuk mengintegrasikan scraper API pihak ketiga tanpa mengubah logika perintah.

---

## 11. Pemecahan Masalah (Troubleshooting)

- **Masalah Sesi / Disconnect**: Hapus folder sesi terkait dan jalankan ulang untuk memindai ulang QR code.
- **FFmpeg Error**: Pastikan binary FFmpeg terpasang di sistem (`which ffmpeg`) atau jalankan via Docker.
- **Izin Berkas**: Pastikan proses memiliki izin tulis pada folder `./data` dan `./temp`.

---

## 12. Lisensi

ISC License.
