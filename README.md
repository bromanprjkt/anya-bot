# Anya Bot

> Public WhatsApp Group Media & Moderation Bot (Versi 0.1 beta)

Anya Bot adalah bot WhatsApp grup publik yang dirancang dengan arsitektur Modular Monolith menggunakan TypeScript murni. Bot ini berfokus pada kecepatan pembuatan stiker, manipulasi media, peralatan administrasi grup, sistem moderasi otomatis, serta pengunduh media eksternal (TikTok & Instagram) dengan mekanisme dual-engine scraper.

---

## 1. Fitur Utama

- **Pemrosesan Media & Stiker**:
  - Konversi gambar dan video pendek (durasi < 10 detik) ke stiker WebP statis maupun animasi.
  - Konversi stiker WebP kembali menjadi gambar PNG (`!toimg`).
  - Ekstraksi stiker kutipan ke foto atau pembaruan metadata EXIF stiker (`!take` / `!colong`).
  - Generator Quote Chat (`!qc`) dengan gelembung obrolan WhatsApp berlatar gelap.
  - Generator teks ke stiker (`!ttp`) dengan latar belakang putih, teks tebal, dan auto-wrapping baris.
  - Metadata stiker terintegrasi dengan tanda penerbit bawaan (`github@bromanprjkt`).

- **Pengunduh Media Dual-Engine**:
  - Pengunduh video dan slide foto TikTok tanpa watermark (mesin utama TikWM, mesin cadangan SSSTik).
  - Pengunduh Reel dan Post Instagram (mesin utama GraphQL API, mesin cadangan SnapSave scraper).
  - Adapter modular untuk integrasi HTTP API scraper eksternal kustom.

- **Peralatan Manajemen Grup**:
  - Panggilan massal seluruh peserta grup (`!tagall`).
  - Informasi detail metadata grup (`!groupinfo`).
  - Daftar pengelola dan administrator grup (`!admins`).
  - Notifikasi otomatis selamat datang (`!welcome`) dan perpisahan anggota (`!goodbye`).

- **Moderasi & Keamanan Otomatis**:
  - Deteksi dan pencegahan tautan berbahaya serta undangan grup lain (`!antilink`) dengan daftar putih domain terpercaya.
  - Pembatasan frekuensi pengiriman perintah berbasis sliding window (`!antispam`).
  - Sistem akumulasi pelanggaran anggota (`!warn` dan `!warnings`) dengan batas maksimal 3 kali sebelum dikeluarkan otomatis dari grup.

- **Administrasi Bot & Sistem**:
  - Auto-read pesan WhatsApp masuk secara otomatis (centang biru).
  - Mode pemeliharaan sistem (`!maintenance`) untuk membatasi eksekusi saat perbaikan.
  - Pemantauan metrik server, memori heap/RSS, waktu aktif, dan antrean pekerjaan (`!botstats`).
  - Antrean pekerjaan media berbasis konkurensi terkontrol untuk mencegah lonjakan CPU dan RAM.

---

## 2. Persyaratan Sistem

- Node.js LTS (v20 atau lebih baru)
- pnpm (v9 atau lebih baru)
- FFmpeg (tersedia di PATH sistem atau melalui kontainer Docker)
- SQLite3
- Docker & Docker Compose (opsional, untuk deployment berbasis kontainer)

---

## 3. Instalasi

1. Klon repositori:
   ```bash
   git clone https://github.com/bromanprjkt/anya-bot.git
   cd anya-bot
   ```

2. Pasang seluruh dependensi:
   ```bash
   pnpm install
   ```

3. Salin konfigurasi lingkungan:
   ```bash
   cp .env.example .env
   ```

4. Sesuaikan nilai pada berkas `.env` sesuai kebutuhan server.

---

## 4. Konfigurasi Lingkungan (.env)

| Variabel | Tipe | Bawaan | Keterangan |
|---|---|---|---|
| `NODE_ENV` | String | `development` | Lingkungan aplikasi (`development`, `production`, `test`) |
| `LOG_LEVEL` | String | `info` | Tingkat log Pino (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) |
| `BOT_PREFIX` | String | `!` | Simbol awalan untuk memicu perintah bot |
| `BOT_OWNER_ID` | String | (Kosong) | JID WhatsApp pemilik bot (contoh: `6281234567890@s.whatsapp.net`) |
| `BOT_VERSION` | String | `0.1 beta` | Versi aktif bot |
| `DATABASE_PATH` | String | `./data/anya.db` | Jalur penyimpanan basis data SQLite lokal |
| `TEMP_DIRECTORY` | String | `./temp` | Direktori penampungan berkas olahan sementara |
| `SESSION_NAME` | String | `anya-session` | Nama folder penyimpanan kredensial sesi Baileys |
| `MAX_CONCURRENT_MEDIA_JOBS` | Number | `2` | Batas pemrosesan media video/stiker secara bersamaan |
| `AUTO_READ` | Boolean | `true` | Menandai pesan masuk sebagai telah dibaca secara otomatis |
| `DOWNLOADER_API_URL` | String | (Kosong) | URL endpoint API scraper pihak ketiga opsional |
| `DOWNLOADER_API_KEY` | String | (Kosong) | Token otentikasi Bearer API scraper eksternal |

---

## 5. Daftar Perintah

### Umum
- `!menu`: Menampilkan daftar perintah yang berhak diakses oleh pengguna beserta banner bot.
- `!ping`: Memeriksa latensi respon soket dan waktu aktif bot.
- `!owner`: Menampilkan kontak nomor pemilik bot.
- `!help [perintah]`: Panduan penggunaan bot atau informasi detail perintah tertentu.

### Media & Stiker
- `!sticker` / `!s`: Mengonversi gambar atau video (maksimal 10 detik) menjadi stiker WebP.
- `!toimg`: Mengonversi stiker yang dibalas menjadi gambar biner PNG.
- `!take` / `!colong`: Mengubah stiker yang dibalas menjadi foto atau memperbarui metadata paket stiker.
- `!qc <teks>`: Membuat stiker kutipan percakapan WhatsApp dengan nama pengguna.
- `!ttp <teks>`: Mengubah teks menjadi stiker berlatar putih dengan pembungkusan baris otomatis.
- `!tiktok` / `!tt <url>`: Mengunduh video atau slide foto TikTok tanpa watermark.
- `!instagram` / `!ig <url>`: Mengunduh video Reel atau Post foto Instagram.

### Pengelolaan Grup
- `!tagall [pesan]`: Menyebut (mention) seluruh anggota grup dalam satu pesan (hanya admin grup).
- `!groupinfo`: Menampilkan ringkasan informasi grup WhatsApp saat ini.
- `!admins`: Menampilkan daftar seluruh administrator grup.
- `!welcome [on|off]`: Mengaktifkan atau menonaktifkan pesan sambutan anggota baru.
- `!goodbye [on|off]`: Mengaktifkan atau menonaktifkan pesan perpisahan anggota keluar.

### Moderasi Grup
- `!antilink [on|off]`: Menghapus pesan anggota non-admin yang memuat tautan terlarang atau tautan grup lain.
- `!antispam [on|off]`: Membatasi spam pesan perintah menggunakan pembatas frekuensi otomatis.
- `!warn @user [alasan]`: Memberikan surat peringatan ke anggota (maksimal 3 kali sebelum kick).
- `!warnings [@user]`: Melihat rekam jejak pelanggaran anggota grup.

### Khusus Pemilik Bot
- `!autoread [on|off]`: Mengaktifkan atau mematikan fitur centang biru otomatis.
- `!maintenance [on|off]`: Menghidupkan mode pemeliharaan bot.
- `!botstats`: Menampilkan statistik sistem, memori, antrean job, dan versi bot.

---

## 6. Perintah Pengembangan

- Menjalankan bot dalam mode pengawasan langsung (live reload):
  ```bash
  pnpm dev
  ```
- Memeriksa kesesuaian tipe data TypeScript:
  ```bash
  pnpm typecheck
  ```
- Menjalankan suite pengujian unit:
  ```bash
  pnpm test
  ```
- Melakukan kompilasi TypeScript ke folder `dist/`:
  ```bash
  pnpm build
  ```
- Menjalankan bot hasil kompilasi:
  ```bash
  pnpm start
  ```

---

## 7. Menjalankan dengan Docker

Proyek ini telah dilengkapi dengan konfigurasi multi-stage build dan Docker Compose untuk kemudahan deployment:

```bash
docker compose up -d
```

Penyimpanan sesi autentikasi dan basis data SQLite akan disimpan secara persisten di folder volume `./data`.

---

## 8. Struktur Direktori

```text
anya-bot/
├── banner.png                  # Banner resmi untuk menu bot
├── compose.yaml                # Konfigurasi Docker Compose
├── Dockerfile                  # Definisi kontainer multi-stage build
├── package.json                # Metadata proyek dan dependensi pnpm
├── tsconfig.json               # Konfigurasi TypeScript strict mode
├── vitest.config.ts            # Konfigurasi unit testing Vitest
├── .env.example                # Templat variabel lingkungan
├── .gitignore                  # Aturan pengabaian berkas git
├── data/                       # Direktori persisten basis data SQLite & sesi
├── temp/                       # Direktori kerja pemrosesan media sementara
├── tests/                      # Suite pengujian unit otomatis
└── src/
    ├── app.ts                  # Inisialisasi dan orkestrator bot utama
    ├── index.ts                # Titik masuk proses bootstrap Node.js
    ├── config/                 # Konfigurasi Zod dan konstanta bawaan
    ├── core/                   # Router perintah, registri, perizinan, rate limiter
    ├── commands/               # Definisi perintah (general, media, group, moderasi, admin)
    ├── repositories/           # Pengelolaan data SQLite (user, group, warning)
    ├── services/               # Layanan bisnis (media, antrean job, downloader)
    ├── utils/                  # Utilitas logger Pino
    └── whatsapp/               # Koneksi soket Baileys dan penanganan event
```

---

## 9. Lisensi

Proyek ini didistribusikan di bawah lisensi ISC.
