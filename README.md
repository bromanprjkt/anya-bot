<p align="center">
  <img src="banner.png" alt="Anya Bot" width="800" />
</p>

# Anya Bot

Bot WhatsApp berbasis TypeScript dan Baileys dengan fitur stiker, downloader media (TikTok & Instagram), moderasi, dan manajemen grup.

**Versi:** 0.1 beta

---

## 1. Fitur Utama

- **Stiker & Media**:
  - Konversi gambar dan video singkat (durasi < 10 detik) ke stiker WebP statis maupun animasi.
  - Konversi stiker WebP kembali menjadi gambar PNG (`!toimg`).
  - Ekstraksi stiker kutipan ke foto atau ubah metadata EXIF stiker (`!take` / `!colong`).
  - Quote Chat generator (`!qc`) dengan gelembung obrolan WhatsApp.
  - Teks ke stiker (`!ttp`) dengan latar putih, teks tebal, dan auto-wrapping baris otomatis.
  - Metadata stiker bawaan dengan tanda penerbit `github@bromanprjkt`.

- **Downloader Media**:
  - Download video dan slide foto TikTok tanpa watermark (mesin utama TikWM, cadangan SSSTik).
  - Download video Reel dan Post Instagram (mesin utama GraphQL API, cadangan SnapSave).
  - Adapter modular untuk integrasi endpoint scraper pihak ketiga.

- **Moderasi & Keamanan**:
  - Anti-link tautan terlarang dan tautan undangan WhatsApp dengan whitelist domain.
  - Anti-spam command berbasis sliding window rate limiter.
  - Sistem sanksi peringatan (`!warn`, `!warnings`) dengan batas maksimal 3 kali sebelum kick otomatis.

- **Fitur Grup**:
  - Mention semua anggota (`!tagall`).
  - Informasi detail grup (`!groupinfo`).
  - Daftar admin (`!admins`).
  - Pesan selamat datang (`!welcome`) dan perpisahan (`!goodbye`).

- **Sistem & Admin**:
  - Auto-read pesan WhatsApp (centang biru otomatis).
  - Mode maintenance (`!maintenance`).
  - Statistik bot (`!botstats`) untuk memantau uptime, RAM, dan antrean pekerjaan media.
  - Antrean proses media terkontrol agar server tidak kelebihan beban.

---

## 2. Persyaratan Sistem

- Node.js LTS (v20+)
- pnpm (v9+)
- FFmpeg (tersedia di PATH sistem atau melalui Docker)
- SQLite3
- Docker & Docker Compose (opsional untuk deployment kontainer)

---

## 3. Instalasi

1. Klon repositori:
   ```bash
   git clone https://github.com/bromanprjkt/anya-bot.git
   cd anya-bot
   ```

2. Pasang dependensi:
   ```bash
   pnpm install
   ```

3. Salin berkas lingkungan:
   ```bash
   cp .env.example .env
   ```

4. Sesuaikan konfigurasi pada `.env`.

---

## 4. Konfigurasi Lingkungan (.env)

| Variabel | Tipe | Bawaan | Keterangan |
|---|---|---|---|
| `NODE_ENV` | String | `development` | Lingkungan aplikasi (`development`, `production`, `test`) |
| `LOG_LEVEL` | String | `info` | Tingkat log Pino (`fatal`, `error`, `warn`, `info`, `debug`, `trace`, `silent`) |
| `BOT_PREFIX` | String | `!` | Awalan pemicu perintah bot |
| `BOT_OWNER_ID` | String | (Kosong) | JID WhatsApp pemilik bot (contoh: `6281234567890@s.whatsapp.net`) |
| `BOT_VERSION` | String | `0.1 beta` | Versi aktif bot |
| `DATABASE_PATH` | String | `./data/anya.db` | Jalur basis data SQLite |
| `TEMP_DIRECTORY` | String | `./temp` | Direktori file olahan sementara |
| `SESSION_NAME` | String | `anya-session` | Nama folder kredensial sesi Baileys |
| `MAX_CONCURRENT_MEDIA_JOBS` | Number | `2` | Batas proses media video/stiker bersamaan |
| `AUTO_READ` | Boolean | `true` | Centang biru pesan masuk otomatis |
| `DOWNLOADER_API_URL` | String | (Kosong) | Endpoint API scraper tambahan |
| `DOWNLOADER_API_KEY` | String | (Kosong) | Kunci otentikasi API scraper eksternal |

---

## 5. Daftar Perintah

### Umum
- `!menu`: Menampilkan menu perintah sesuai izin akses pengguna beserta banner bot.
- `!ping`: Cek latensi dan waktu aktif bot.
- `!owner`: Kontak nomor pemilik bot.
- `!help [perintah]`: Panduan penggunaan bot atau informasi detail perintah.

### Stiker & Media
- `!sticker` / `!s`: Buat stiker dari gambar atau video (maksimal 10 detik).
- `!toimg`: Ubah stiker menjadi foto/gambar PNG.
- `!take` / `!colong`: Ubah stiker kutipan jadi foto atau ganti metadata stiker.
- `!qc <teks>`: Buat stiker Quote Chat percakapan WhatsApp.
- `!ttp <teks>`: Buat stiker teks dengan latar putih.
- `!smeme <teks atas> | <teks bawah>` / `!stikermeme`: Buat stiker meme dari gambar atau stiker.
- `!tiktok` / `!tt <url>`: Download video atau slide foto TikTok tanpa watermark.
- `!instagram` / `!ig <url>`: Download video Reel atau Post foto Instagram.

### Fitur Grup
- `!tagall [pesan]`: Tag seluruh member (khusus admin grup).
- `!groupinfo`: Lihat informasi dan pengaturan grup saat ini.
- `!admins`: Tampilkan daftar seluruh admin grup.
- `!welcome [on|off]`: Aktifkan atau matikan pesan sambutan member baru.
- `!goodbye [on|off]`: Aktifkan atau matikan pesan perpisahan member keluar.

### Moderasi
- `!antilink [on|off]`: Hapus pesan member yang mengirim link terlarang atau link grup lain.
- `!antispam [on|off]`: Batasi spam perintah dengan rate limiter.
- `!warn @user [alasan]`: Beri peringatan ke member (maksimal 3 kali sebelum dikeluarkan).
- `!warnings [@user]`: Cek daftar peringatan member.

### Pemilik Bot
- `!autoread [on|off]`: Pengaturan centang biru otomatis.
- `!maintenance [on|off]`: Aktifkan atau matikan mode pemeliharaan bot.
- `!botstats`: Cek metrik memori, antrean job media, uptime, dan versi bot.

---

## 6. Perintah Pengembangan

- Mode pengembangan dengan live reload:
  ```bash
  pnpm dev
  ```
- Pemeriksaan tipe data TypeScript:
  ```bash
  pnpm typecheck
  ```
- Menjalankan unit test:
  ```bash
  pnpm test
  ```
- Kompilasi TypeScript ke folder `dist/`:
  ```bash
  pnpm build
  ```
- Menjalankan kode hasil kompilasi:
  ```bash
  pnpm start
  ```

---

## 7. Menjalankan dengan Docker

```bash
docker compose up -d
```

Sesi login WhatsApp dan database SQLite tersimpan persisten pada folder `./data`.

---



## 8. Lisensi

GPL License.
