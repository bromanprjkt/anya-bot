/**
 * Nilai konstanta bawaan untuk konfigurasi Anya Bot.
 */
export const KONFIGURASI_BAWAAN = {
  VERSI_BOT: "0.1 beta",
  AWALAN_PERINTAH: "!",
  TINGKAT_LOG: "info" as const,
  DIREKTORI_SEMENTARA: "./temp",
  JALUR_DATABASE: "./data/anya.db",
  NAMA_SESI: "anya-session",
  BATAS_PEKERJAAN_MEDIA_BERSAMAAN: 2,
  BACA_PESAN_OTOMATIS: true,
} as const;
