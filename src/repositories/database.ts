import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { buatPencatat } from "../utils/logger.js";
import { konfigurasiEnv } from "../config/env.js";

const pencatat = buatPencatat("BasisData");

let instanceBasisData: Database.Database | null = null;

function inisialisasiSkema(db: Database.Database): void {
  pencatat.info("Menyiapkan skema tabel basis data SQLite...");

  db.exec(`
    CREATE TABLE IF NOT EXISTS groups (
      id_grup TEXT PRIMARY KEY,
      nama_grup TEXT NOT NULL,
      welcome_aktif INTEGER DEFAULT 0,
      goodbye_aktif INTEGER DEFAULT 0,
      antilink_aktif INTEGER DEFAULT 0,
      antispam_aktif INTEGER DEFAULT 0,
      dibuat_pada TEXT NOT NULL,
      diperbarui_pada TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id_pengguna TEXT PRIMARY KEY,
      nama_pengguna TEXT NOT NULL,
      total_pesan INTEGER DEFAULT 0,
      dibuat_pada TEXT NOT NULL,
      diperbarui_pada TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS warnings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_grup TEXT NOT NULL,
      id_pengguna TEXT NOT NULL,
      alasan TEXT NOT NULL,
      diberikan_oleh TEXT NOT NULL,
      dibuat_pada TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS bot_settings (
      kunci TEXT PRIMARY KEY,
      nilai TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_sesi TEXT NOT NULL,
      tipe_obrolan TEXT NOT NULL,
      id_pengguna TEXT NOT NULL,
      nama_pengguna TEXT NOT NULL,
      peran TEXT NOT NULL,
      konten TEXT NOT NULL,
      dibuat_pada INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_memory_sesi ON ai_memory(id_sesi, dibuat_pada);

    CREATE TABLE IF NOT EXISTS ai_user_facts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_pengguna TEXT NOT NULL,
      nama_pengguna TEXT NOT NULL,
      kategori TEXT NOT NULL,
      fakta TEXT NOT NULL,
      dibuat_pada INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_ai_user_facts_pengguna ON ai_user_facts(id_pengguna, dibuat_pada);
  `);

  pencatat.info("Skema basis data SQLite berhasil disiapkan");
}

export function ambilBasisData(jalurKustom?: string): Database.Database {
  if (instanceBasisData && !jalurKustom) {
    return instanceBasisData;
  }

  const jalurDb = jalurKustom ?? konfigurasiEnv.jalurDatabase;
  const folder = path.dirname(jalurDb);

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
  }

  pencatat.info({ jalur: jalurDb }, "Membuka koneksi ke basis data SQLite");

  const db = new Database(jalurDb);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  inisialisasiSkema(db);

  if (!jalurKustom) {
    instanceBasisData = db;
  }

  return db;
}
