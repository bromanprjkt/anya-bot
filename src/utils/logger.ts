import pino from "pino";
import { konfigurasiEnv } from "../config/env.js";

const apakahPengembangan = konfigurasiEnv.lingkungan === "development";

export function buatPencatat(namaKomponen?: string): pino.Logger {
  const tingkatLog = konfigurasiEnv.tingkatLog;

  const konfigurasiPencatat: pino.LoggerOptions = {
    level: tingkatLog,
    redact: {
      paths: [
        "kunciApi",
        "kunciApiPengunduh",
        "token",
        "kataSandi",
        "kredensial",
        "*.kunciApi",
        "*.token",
        "*.kataSandi",
      ],
      censor: "[TERSEMBUNYI]",
    },
    base: namaKomponen ? { komponen: namaKomponen } : undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  };

  if (apakahPengembangan) {
    return pino({
      ...konfigurasiPencatat,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        },
      },
    });
  }

  return pino(konfigurasiPencatat);
}

export const pencatatUtama = buatPencatat("Aplikasi");
