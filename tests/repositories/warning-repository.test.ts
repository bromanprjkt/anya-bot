import { describe, it, expect, beforeEach } from "vitest";
import { ambilBasisData } from "../../src/repositories/database.js";
import { RepositoriPeringatan } from "../../src/repositories/warning-repository.js";
import type Database from "better-sqlite3";

describe("RepositoriPeringatan", () => {
  let db: Database.Database;
  let repositori: RepositoriPeringatan;

  beforeEach(() => {
    db = ambilBasisData(":memory:");
    repositori = new RepositoriPeringatan(db);
  });

  it("harus menambahkan dan menghitung total peringatan", () => {
    repositori.tambahPeringatan(
      "grup1@g.us",
      "user1@s.whatsapp.net",
      "Kirim link judi",
      "admin@s.whatsapp.net"
    );

    const total = repositori.hitungTotalPeringatan("grup1@g.us", "user1@s.whatsapp.net");
    expect(total).toBe(1);

    const daftar = repositori.ambilDaftarPeringatan("grup1@g.us", "user1@s.whatsapp.net");
    expect(daftar.length).toBe(1);
    expect(daftar[0]?.alasan).toBe("Kirim link judi");
  });

  it("harus mereset semua peringatan pengguna pada grup", () => {
    repositori.tambahPeringatan("grup1@g.us", "user1@s.whatsapp.net", "Peringatan 1", "admin");
    repositori.tambahPeringatan("grup1@g.us", "user1@s.whatsapp.net", "Peringatan 2", "admin");

    expect(repositori.hitungTotalPeringatan("grup1@g.us", "user1@s.whatsapp.net")).toBe(2);

    const terhapus = repositori.resetPeringatan("grup1@g.us", "user1@s.whatsapp.net");
    expect(terhapus).toBe(2);
    expect(repositori.hitungTotalPeringatan("grup1@g.us", "user1@s.whatsapp.net")).toBe(0);
  });
});
