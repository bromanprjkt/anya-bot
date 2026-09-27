import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { LayananPenyimpananSementara } from "../../src/services/storage/temp-storage.js";

describe("LayananPenyimpananSementara", () => {
  const folderUji = path.join(process.cwd(), "temp", "uji-storage");
  let layanan: LayananPenyimpananSementara;

  beforeEach(() => {
    layanan = new LayananPenyimpananSementara(folderUji);
  });

  afterEach(() => {
    if (fs.existsSync(folderUji)) {
      fs.rmSync(folderUji, { recursive: true, force: true });
    }
  });

  it("harus menghasilkan jalur sementara unik dengan ekstensi yang benar", () => {
    const jalur = layanan.buatJalurSementara("webp");
    expect(jalur).toContain(".webp");
    expect(jalur.startsWith(folderUji)).toBe(true);
  });

  it("harus membersihkan berkas setelah fungsi bungkus selesai", async () => {
    let jalurTercatat = "";

    const hasil = await layanan.bungkusDenganPembersihan(async (jalurSementara) => {
      jalurTercatat = jalurSementara;
      fs.writeFileSync(jalurSementara, "isi berkas uji");
      expect(fs.existsSync(jalurSementara)).toBe(true);
      return 12345;
    }, "txt");

    expect(hasil).toBe(12345);
    expect(fs.existsSync(jalurTercatat)).toBe(false);
  });

  it("harus tetap membersihkan berkas saat terjadi error dalam proses", async () => {
    let jalurTercatat = "";

    await expect(
      layanan.bungkusDenganPembersihan(async (jalurSementara) => {
        jalurTercatat = jalurSementara;
        fs.writeFileSync(jalurSementara, "isi berkas gagal");
        throw new Error("Simulasi error");
      }, "tmp")
    ).rejects.toThrow("Simulasi error");

    expect(fs.existsSync(jalurTercatat)).toBe(false);
  });
});
