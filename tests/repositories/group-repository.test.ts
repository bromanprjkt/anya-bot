import { describe, it, expect, beforeEach } from "vitest";
import { ambilBasisData } from "../../src/repositories/database.js";
import { RepositoriGrup } from "../../src/repositories/group-repository.js";
import type Database from "better-sqlite3";

describe("RepositoriGrup", () => {
  let db: Database.Database;
  let repositori: RepositoriGrup;

  beforeEach(() => {
    db = ambilBasisData(":memory:");
    repositori = new RepositoriGrup(db);
  });

  it("harus membuat entitas grup baru jika belum ada", () => {
    const grup = repositori.ambilAtauBuatGrup("grup1@g.us", "Grup Uji Coba");

    expect(grup.idGrup).toBe("grup1@g.us");
    expect(grup.namaGrup).toBe("Grup Uji Coba");
    expect(grup.welcomeAktif).toBe(false);
    expect(grup.antilinkAktif).toBe(false);
  });

  it("harus memperbarui pengaturan saklar fitur grup", () => {
    repositori.ambilAtauBuatGrup("grup1@g.us", "Grup Uji Coba");

    repositori.perbaruiPengaturan("grup1@g.us", {
      welcomeAktif: true,
      antilinkAktif: true,
    });

    expect(repositori.apakahWelcomeAktif("grup1@g.us")).toBe(true);
    expect(repositori.apakahAntilinkAktif("grup1@g.us")).toBe(true);
    expect(repositori.apakahGoodbyeAktif("grup1@g.us")).toBe(false);
  });
});
