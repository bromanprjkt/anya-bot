import { describe, it, expect } from "vitest";
import { RegistriPerintah, type PerintahBot } from "../../src/core/command-registry.js";

describe("RegistriPerintah", () => {
  it("harus dapat mendaftarkan dan mencari perintah berdasarkan nama", () => {
    const registri = new RegistriPerintah();
    const perintahDummy: PerintahBot = {
      nama: "ping",
      alias: ["p"],
      deskripsi: "Cek ping",
      kategori: "general",
      jalankan: async () => {},
    };

    registri.daftarkan(perintahDummy);

    expect(registri.cariPerintah("ping")).toBe(perintahDummy);
    expect(registri.cariPerintah("p")).toBe(perintahDummy);
    expect(registri.cariPerintah("PING")).toBe(perintahDummy);
    expect(registri.cariPerintah("tidakada")).toBeUndefined();
  });

  it("harus mengelompokkan perintah berdasarkan kategori", () => {
    const registri = new RegistriPerintah();

    registri.daftarkan({
      nama: "ping",
      alias: [],
      deskripsi: "Ping",
      kategori: "general",
      jalankan: async () => {},
    });

    registri.daftarkan({
      nama: "sticker",
      alias: ["s"],
      deskripsi: "Buat stiker",
      kategori: "sticker",
      jalankan: async () => {},
    });

    const kelompok = registri.ambilBerdasarkanKategori();
    expect(kelompok.get("general")?.length).toBe(1);
    expect(kelompok.get("sticker")?.length).toBe(1);
  });
});
