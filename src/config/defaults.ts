import fs from "node:fs";
import path from "node:path";

function ambilVersiDariPackage(): string {
  try {
    const jalurPackage = path.resolve(process.cwd(), "package.json");
    if (fs.existsSync(jalurPackage)) {
      const data = JSON.parse(fs.readFileSync(jalurPackage, "utf8"));
      if (data.version) {
        return String(data.version);
      }
    }
  } catch {}
  return "0.3";
}

export const KONFIGURASI_BAWAAN = {
  VERSI_BOT: ambilVersiDariPackage(),
  AWALAN_PERINTAH: "!",
  TINGKAT_LOG: "info" as const,
  DIREKTORI_SEMENTARA: "./temp",
  JALUR_DATABASE: "./data/anya.db",
  NAMA_SESI: "anya-session",
  BATAS_PEKERJAAN_MEDIA_BERSAMAAN: 2,
  BACA_PESAN_OTOMATIS: true,
  AI_AKTIF: true,
  AI_BASE_URL: "https://tokenharbor.ai/v1",
  AI_API_KEY: "",
  AI_MODEL: "deepseek-v4.1-flash:free",
  AI_FALLBACK_BASE_URL: "https://codecraftapi.com/v1",
  AI_FALLBACK_API_KEY: "",
  AI_FALLBACK_MODEL: "deepseek-v4-pro-0813",
  AI_BATAS_KONKURENSI: 15,
  AI_BATAS_ANTREAN: 2000,
  AI_BATAS_AKTIF_PER_PENGGUNA: 1,
  AI_BATAS_WAKTU_ANTREAN_MS: 60000,
} as const;
