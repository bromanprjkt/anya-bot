import type Database from "better-sqlite3";
import { ambilBasisData } from "./database.js";

export interface EntitasPengguna {
  idPengguna: string;
  namaPengguna: string;
  totalPesan: number;
  dibuatPada: string;
  diperbaruiPada: string;
}

interface BarisPenggunaDb {
  id_pengguna: string;
  nama_pengguna: string;
  total_pesan: number;
  dibuat_pada: string;
  diperbarui_pada: string;
}

export class RepositoriPengguna {
  private readonly db: Database.Database;

  constructor(dbKustom?: Database.Database) {
    this.db = dbKustom ?? ambilBasisData();
  }

  private petakan(baris: BarisPenggunaDb): EntitasPengguna {
    return {
      idPengguna: baris.id_pengguna,
      namaPengguna: baris.nama_pengguna,
      totalPesan: baris.total_pesan,
      dibuatPada: baris.dibuat_pada,
      diperbaruiPada: baris.diperbarui_pada,
    };
  }

  /**
   * Mengambil data pengguna atau membuat baru jika belum ada.
   */
  public catatPengguna(idPengguna: string, namaPengguna: string): EntitasPengguna {
    const ambilStmt = this.db.prepare("SELECT * FROM users WHERE id_pengguna = ?");
    const ada = ambilStmt.get(idPengguna) as BarisPenggunaDb | undefined;

    if (ada) {
      return this.petakan(ada);
    }

    const sekarang = new Date().toISOString();
    const buatStmt = this.db.prepare(`
      INSERT INTO users (id_pengguna, nama_pengguna, total_pesan, dibuat_pada, diperbarui_pada)
      VALUES (?, ?, 0, ?, ?)
    `);

    buatStmt.run(idPengguna, namaPengguna, sekarang, sekarang);

    return {
      idPengguna,
      namaPengguna,
      totalPesan: 0,
      dibuatPada: sekarang,
      diperbaruiPada: sekarang,
    };
  }

  /**
   * Menambah penghitung pesan terkirim pengguna.
   */
  public tambahPesanPengguna(idPengguna: string, namaPengguna: string): void {
    const sekarang = new Date().toISOString();
    this.catatPengguna(idPengguna, namaPengguna);

    const updateStmt = this.db.prepare(`
      UPDATE users
      SET total_pesan = total_pesan + 1, nama_pengguna = ?, diperbarui_pada = ?
      WHERE id_pengguna = ?
    `);

    updateStmt.run(namaPengguna, sekarang, idPengguna);
  }

  public ambilPengguna(idPengguna: string): EntitasPengguna | undefined {
    const stmt = this.db.prepare("SELECT * FROM users WHERE id_pengguna = ?");
    const hasil = stmt.get(idPengguna) as BarisPenggunaDb | undefined;
    return hasil ? this.petakan(hasil) : undefined;
  }
}

export const repositoriPengguna = new RepositoriPengguna();
