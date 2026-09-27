# Panduan Pengembang & Agen AI (AGENTS.md)

Dokumen ini berisi pedoman arsitektur dan aturan pengkodean untuk proyek **Anya Bot**.

---

## 1. Aturan Wajib Bahasa Identifier (SANGAT PENTING)

Semua identifier buatan sendiri **WAJIB** menggunakan **Bahasa Indonesia**.

Berlaku untuk:
- variable
- constant
- function
- parameter
- class
- interface
- type
- enum
- object property
- database field
- service method
- repository method
- command property
- event handler
- internal module identifier

### Pengecualian:
- Nama file dan folder tetap menggunakan bahasa Inggris (contoh: `src/commands/`, `src/services/`, `env.ts`).
- Nama teknis resmi dari library eksternal (contoh: `makeWASocket`, `WASocket`, `pino`, `vitest`, `zod`).

---

## 2. Standar Kualitas & Arsitektur
- **100% TypeScript** dengan `strict: true`.
- Tidak menggunakan tipe `any` tanpa alasan eksplisit.
- Arsitektur **Modular Monolith**:
  `Command` -> `Service` -> `Repository / External Adapter`.
- Konfigurasi terpusat melalui variabel lingkungan dan divalidasi dengan Zod.
- Tidak pernah commit credential, session WhatsApp, atau berkas `.env`.
- Berkas sementara (`temp/`) harus selalu dibersihkan secara otomatis (`try ... finally`).
- Penanganan error eksplisit tanpa menelan error secara diam-diam.

---

## 3. Skrip Pengembangan
- `pnpm dev`: Menjalankan bot dalam mode pengembangan (live reload).
- `pnpm build`: Melakukan kompilasi TypeScript ke folder `dist/`.
- `pnpm start`: Menjalankan bot hasil kompilasi.
- `pnpm typecheck`: Memeriksa kesesuaian tipe data TypeScript.
- `pnpm test`: Menjalankan suite pengujian unit dengan Vitest.
