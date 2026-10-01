import type Database from "better-sqlite3";
import { ambilBasisData } from "./database.js";

export interface EntriMemoriAi {
  id: number;
  idSesi: string;
  tipeObrolan: "grup" | "pribadi";
  idPengguna: string;
  namaPengguna: string;
  peran: "user" | "assistant";
  konten: string;
  dibuatPada: number;
}

interface BarisMemoriDb {
  id: number;
  id_sesi: string;
  tipe_obrolan: string;
  id_pengguna: string;
  nama_pengguna: string;
  peran: string;
  konten: string;
  dibuat_pada: number;
}

export class RepositoriMemoriAi {
  private readonly db: Database.Database;

  constructor(dbKustom?: Database.Database) {
    this.db = dbKustom ?? ambilBasisData();
  }

  private petakan(baris: BarisMemoriDb): EntriMemoriAi {
    return {
      id: baris.id,
      idSesi: baris.id_sesi,
      tipeObrolan: baris.tipe_obrolan as "grup" | "pribadi",
      idPengguna: baris.id_pengguna,
      namaPengguna: baris.nama_pengguna,
      peran: baris.peran as "user" | "assistant",
      konten: baris.konten,
      dibuatPada: baris.dibuat_pada,
    };
  }

  public simpanPesan(
    idSesi: string,
    tipeObrolan: "grup" | "pribadi",
    idPengguna: string,
    namaPengguna: string,
    peran: "user" | "assistant",
    konten: string
  ): void {
    const waktu = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO ai_memory (id_sesi, tipe_obrolan, id_pengguna, nama_pengguna, peran, konten, dibuat_pada)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(idSesi, tipeObrolan, idPengguna, namaPengguna, peran, konten, waktu);

    this.pangkasRiwayat(idSesi, 30);
  }

  public ambilRiwayat(idSesi: string, batas = 16): EntriMemoriAi[] {
    const stmt = this.db.prepare(`
      SELECT * FROM (
        SELECT * FROM ai_memory
        WHERE id_sesi = ?
        ORDER BY dibuat_pada DESC, id DESC
        LIMIT ?
      ) ORDER BY dibuat_pada ASC, id ASC
    `);

    const daftar = stmt.all(idSesi, batas) as BarisMemoriDb[];
    return daftar.map((b) => this.petakan(b));
  }

  public hapusRiwayat(idSesi: string): void {
    const stmt = this.db.prepare("DELETE FROM ai_memory WHERE id_sesi = ?");
    stmt.run(idSesi);
  }

  public pangkasRiwayat(idSesi: string, batasMaksimal: number): void {
    const stmt = this.db.prepare(`
      DELETE FROM ai_memory
      WHERE id_sesi = ? AND id NOT IN (
        SELECT id FROM ai_memory
        WHERE id_sesi = ?
        ORDER BY dibuat_pada DESC, id DESC
        LIMIT ?
      )
    `);
    stmt.run(idSesi, idSesi, batasMaksimal);
  }

  public simpanFakta(
    idPengguna: string,
    namaPengguna: string,
    fakta: string,
    kategori = "umum"
  ): void {
    const idBersih = (idPengguna.split("@")[0]?.split(":")[0] || idPengguna).trim();
    if (!idBersih || !fakta.trim()) return;

    const waktu = Date.now();
    const cekAda = this.db.prepare(`
      SELECT id FROM ai_user_facts
      WHERE id_pengguna = ? AND fakta = ?
    `).get(idBersih, fakta.trim());

    if (cekAda) return;

    const stmt = this.db.prepare(`
      INSERT INTO ai_user_facts (id_pengguna, nama_pengguna, kategori, fakta, dibuat_pada)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(idBersih, namaPengguna, kategori.trim().toLowerCase(), fakta.trim(), waktu);
  }

  public ambilFaktaPengguna(idPengguna: string, batas = 10): EntriFaktaPengguna[] {
    const idBersih = (idPengguna.split("@")[0]?.split(":")[0] || idPengguna).trim();
    if (!idBersih) return [];

    const stmt = this.db.prepare(`
      SELECT * FROM ai_user_facts
      WHERE id_pengguna = ?
      ORDER BY dibuat_pada DESC
      LIMIT ?
    `);

    const daftar = stmt.all(idBersih, batas) as BarisFaktaDb[];
    return daftar.map((b) => ({
      id: b.id,
      idPengguna: b.id_pengguna,
      namaPengguna: b.nama_pengguna,
      kategori: b.kategori,
      fakta: b.fakta,
      dibuatPada: b.dibuat_pada,
    }));
  }

  public hapusFaktaPengguna(idPengguna: string): void {
    const idBersih = (idPengguna.split("@")[0]?.split(":")[0] || idPengguna).trim();
    if (!idBersih) return;

    const stmt = this.db.prepare("DELETE FROM ai_user_facts WHERE id_pengguna = ?");
    stmt.run(idBersih);
  }
}

export interface EntriFaktaPengguna {
  id: number;
  idPengguna: string;
  namaPengguna: string;
  kategori: string;
  fakta: string;
  dibuatPada: number;
}

interface BarisFaktaDb {
  id: number;
  id_pengguna: string;
  nama_pengguna: string;
  kategori: string;
  fakta: string;
  dibuat_pada: number;
}

export const repositoriMemoriAi = new RepositoriMemoriAi();
