import type Database from "better-sqlite3";
import { ambilBasisData } from "./database.js";

export interface EntitasPeringatan {
  id: number;
  idGrup: string;
  idPengguna: string;
  alasan: string;
  diberikanOleh: string;
  dibuatPada: string;
}

interface BarisPeringatanDb {
  id: number;
  id_grup: string;
  id_pengguna: string;
  alasan: string;
  diberikan_oleh: string;
  dibuat_pada: string;
}

export class RepositoriPeringatan {
  private readonly db: Database.Database;

  constructor(dbKustom?: Database.Database) {
    this.db = dbKustom ?? ambilBasisData();
  }

  private petakan(baris: BarisPeringatanDb): EntitasPeringatan {
    return {
      id: baris.id,
      idGrup: baris.id_grup,
      idPengguna: baris.id_pengguna,
      alasan: baris.alasan,
      diberikanOleh: baris.diberikan_oleh,
      dibuatPada: baris.dibuat_pada,
    };
  }

  public tambahPeringatan(
    idGrup: string,
    idPengguna: string,
    alasan: string,
    diberikanOleh: string
  ): EntitasPeringatan {
    const sekarang = new Date().toISOString();
    const stmt = this.db.prepare(`
      INSERT INTO warnings (id_grup, id_pengguna, alasan, diberikan_oleh, dibuat_pada)
      VALUES (?, ?, ?, ?, ?)
    `);

    const hasil = stmt.run(idGrup, idPengguna, alasan, diberikanOleh, sekarang);

    return {
      id: Number(hasil.lastInsertRowid),
      idGrup,
      idPengguna,
      alasan,
      diberikanOleh,
      dibuatPada: sekarang,
    };
  }

  public ambilDaftarPeringatan(
    idGrup: string,
    idPengguna: string
  ): EntitasPeringatan[] {
    const stmt = this.db.prepare(`
      SELECT * FROM warnings
      WHERE id_grup = ? AND id_pengguna = ?
      ORDER BY id ASC
    `);

    const daftar = stmt.all(idGrup, idPengguna) as BarisPeringatanDb[];
    return daftar.map((b) => this.petakan(b));
  }

  public hitungTotalPeringatan(idGrup: string, idPengguna: string): number {
    const stmt = this.db.prepare(`
      SELECT COUNT(*) as total FROM warnings
      WHERE id_grup = ? AND id_pengguna = ?
    `);

    const hasil = stmt.get(idGrup, idPengguna) as { total: number };
    return hasil.total;
  }

  public resetPeringatan(idGrup: string, idPengguna: string): number {
    const stmt = this.db.prepare(`
      DELETE FROM warnings
      WHERE id_grup = ? AND id_pengguna = ?
    `);

    const hasil = stmt.run(idGrup, idPengguna);
    return hasil.changes;
  }
}

export const repositoriPeringatan = new RepositoriPeringatan();
