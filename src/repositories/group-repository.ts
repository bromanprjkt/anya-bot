import type Database from "better-sqlite3";
import { ambilBasisData } from "./database.js";

export interface EntitasGrup {
  idGrup: string;
  namaGrup: string;
  welcomeAktif: boolean;
  goodbyeAktif: boolean;
  antilinkAktif: boolean;
  antispamAktif: boolean;
  dibuatPada: string;
  diperbaruiPada: string;
}

interface BarisGrupDb {
  id_grup: string;
  nama_grup: string;
  welcome_aktif: number;
  goodbye_aktif: number;
  antilink_aktif: number;
  antispam_aktif: number;
  dibuat_pada: string;
  diperbarui_pada: string;
}

export class RepositoriGrup {
  private readonly db: Database.Database;

  constructor(dbKustom?: Database.Database) {
    this.db = dbKustom ?? ambilBasisData();
  }

  private petakanBarisKeEntitas(baris: BarisGrupDb): EntitasGrup {
    return {
      idGrup: baris.id_grup,
      namaGrup: baris.nama_grup,
      welcomeAktif: baris.welcome_aktif === 1,
      goodbyeAktif: baris.goodbye_aktif === 1,
      antilinkAktif: baris.antilink_aktif === 1,
      antispamAktif: baris.antispam_aktif === 1,
      dibuatPada: baris.dibuat_pada,
      diperbaruiPada: baris.diperbarui_pada,
    };
  }

  public ambilAtauBuatGrup(idGrup: string, namaGrup: string): EntitasGrup {
    const ambilStmt = this.db.prepare(
      "SELECT * FROM groups WHERE id_grup = ?"
    );
    const ada = ambilStmt.get(idGrup) as BarisGrupDb | undefined;

    if (ada) {
      return this.petakanBarisKeEntitas(ada);
    }

    const sekarang = new Date().toISOString();
    const buatStmt = this.db.prepare(`
      INSERT INTO groups (id_grup, nama_grup, welcome_aktif, goodbye_aktif, antilink_aktif, antispam_aktif, dibuat_pada, diperbarui_pada)
      VALUES (?, ?, 0, 0, 0, 0, ?, ?)
    `);

    buatStmt.run(idGrup, namaGrup, sekarang, sekarang);

    return {
      idGrup,
      namaGrup,
      welcomeAktif: false,
      goodbyeAktif: false,
      antilinkAktif: false,
      antispamAktif: false,
      dibuatPada: sekarang,
      diperbaruiPada: sekarang,
    };
  }

  public perbaruiPengaturan(
    idGrup: string,
    pengaturan: Partial<
      Pick<
        EntitasGrup,
        "welcomeAktif" | "goodbyeAktif" | "antilinkAktif" | "antispamAktif"
      >
    >
  ): void {
    const sekarang = new Date().toISOString();
    const grup = this.ambilAtauBuatGrup(idGrup, "Grup WhatsApp");

    const welcome = pengaturan.welcomeAktif !== undefined
      ? (pengaturan.welcomeAktif ? 1 : 0)
      : (grup.welcomeAktif ? 1 : 0);

    const goodbye = pengaturan.goodbyeAktif !== undefined
      ? (pengaturan.goodbyeAktif ? 1 : 0)
      : (grup.goodbyeAktif ? 1 : 0);

    const antilink = pengaturan.antilinkAktif !== undefined
      ? (pengaturan.antilinkAktif ? 1 : 0)
      : (grup.antilinkAktif ? 1 : 0);

    const antispam = pengaturan.antispamAktif !== undefined
      ? (pengaturan.antispamAktif ? 1 : 0)
      : (grup.antispamAktif ? 1 : 0);

    const updateStmt = this.db.prepare(`
      UPDATE groups
      SET welcome_aktif = ?, goodbye_aktif = ?, antilink_aktif = ?, antispam_aktif = ?, diperbarui_pada = ?
      WHERE id_grup = ?
    `);

    updateStmt.run(welcome, goodbye, antilink, antispam, sekarang, idGrup);
  }

  public apakahWelcomeAktif(idGrup: string): boolean {
    const grup = this.ambilAtauBuatGrup(idGrup, "Grup WhatsApp");
    return grup.welcomeAktif;
  }

  public apakahGoodbyeAktif(idGrup: string): boolean {
    const grup = this.ambilAtauBuatGrup(idGrup, "Grup WhatsApp");
    return grup.goodbyeAktif;
  }

  public apakahAntilinkAktif(idGrup: string): boolean {
    const grup = this.ambilAtauBuatGrup(idGrup, "Grup WhatsApp");
    return grup.antilinkAktif;
  }

  public apakahAntispamAktif(idGrup: string): boolean {
    const grup = this.ambilAtauBuatGrup(idGrup, "Grup WhatsApp");
    return grup.antispamAktif;
  }
}

export const repositoriGrup = new RepositoriGrup();
