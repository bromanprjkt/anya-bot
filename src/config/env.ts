import dotenv from "dotenv";
import { z } from "zod";
import { KONFIGURASI_BAWAAN } from "./defaults.js";

dotenv.config();

const skemaEnv = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default(KONFIGURASI_BAWAAN.TINGKAT_LOG),
  BOT_PREFIX: z.string().min(1).default(KONFIGURASI_BAWAAN.AWALAN_PERINTAH),
  BOT_OWNER_ID: z.string().default(""),
  DATABASE_PATH: z.string().min(1).default(KONFIGURASI_BAWAAN.JALUR_DATABASE),
  TEMP_DIRECTORY: z
    .string()
    .min(1)
    .default(KONFIGURASI_BAWAAN.DIREKTORI_SEMENTARA),
  SESSION_NAME: z.string().min(1).default(KONFIGURASI_BAWAAN.NAMA_SESI),
  MAX_CONCURRENT_MEDIA_JOBS: z
    .coerce
    .number()
    .int()
    .positive()
    .default(KONFIGURASI_BAWAAN.BATAS_PEKERJAAN_MEDIA_BERSAMAAN),
  DOWNLOADER_API_URL: z.string().optional().default(""),
  DOWNLOADER_API_KEY: z.string().optional().default(""),
  AUTO_READ: z
    .preprocess(
      (nilai) => (typeof nilai === "string" ? nilai.toLowerCase() === "true" || nilai === "1" : nilai),
      z.boolean()
    )
    .default(KONFIGURASI_BAWAAN.BACA_PESAN_OTOMATIS),
});

export interface KonfigurasiEnv {
  lingkungan: "development" | "production" | "test";
  tingkatLog: "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
  awalanPerintah: string;
  idPemilikBot: string;
  jalurDatabase: string;
  direktoriSementara: string;
  namaSesi: string;
  batasPekerjaanMediaBersamaan: number;
  urlApiPengunduh: string;
  kunciApiPengunduh: string;
  bacaPesanOtomatis: boolean;
}

/**
 * Mengurai dan memvalidasi konfigurasi lingkungan.
 *
 * @param variabelLingkungan Objek variabel lingkungan (bawaan: process.env)
 * @returns KonfigurasiEnv yang telah tervalidasi dengan identifier Bahasa Indonesia
 */
export function uraiKonfigurasiEnv(
  variabelLingkungan: NodeJS.ProcessEnv = process.env
): KonfigurasiEnv {
  const hasilUrai = skemaEnv.safeParse(variabelLingkungan);

  if (!hasilUrai.success) {
    const daftarKesalahan = hasilUrai.error.issues
      .map((isu) => `${isu.path.join(".")}: ${isu.message}`)
      .join(", ");
    throw new Error(
      `Konfigurasi lingkungan tidak valid: ${daftarKesalahan}`
    );
  }

  const data = hasilUrai.data;

  return {
    lingkungan: data.NODE_ENV,
    tingkatLog: data.LOG_LEVEL,
    awalanPerintah: data.BOT_PREFIX,
    idPemilikBot: data.BOT_OWNER_ID,
    jalurDatabase: data.DATABASE_PATH,
    direktoriSementara: data.TEMP_DIRECTORY,
    namaSesi: data.SESSION_NAME,
    batasPekerjaanMediaBersamaan: data.MAX_CONCURRENT_MEDIA_JOBS,
    urlApiPengunduh: data.DOWNLOADER_API_URL,
    kunciApiPengunduh: data.DOWNLOADER_API_KEY,
    bacaPesanOtomatis: data.AUTO_READ,
  };
}

export const konfigurasiEnv: KonfigurasiEnv = uraiKonfigurasiEnv(process.env);
