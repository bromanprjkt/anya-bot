import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buatPencatat } from "../../utils/logger.js";
import { konfigurasiEnv } from "../../config/env.js";

const pencatat = buatPencatat("PenyimpananSementara");

export class LayananPenyimpananSementara {
  private readonly direktoriSementara: string;

  constructor(direktoriKustom?: string) {
    this.direktoriSementara = path.resolve(
      direktoriKustom ?? konfigurasiEnv.direktoriSementara
    );
    if (!fsSync.existsSync(this.direktoriSementara)) {
      fsSync.mkdirSync(this.direktoriSementara, { recursive: true });
    }
  }

  public buatJalurSementara(ekstensi: string): string {
    const idAcak = crypto.randomUUID();
    const namaBerkas = `anya_${idAcak}.${ekstensi.replace(/^\./, "")}`;
    return path.join(this.direktoriSementara, namaBerkas);
  }

  public async bersihkanBerkas(jalurBerkas: string): Promise<void> {
    try {
      if (fsSync.existsSync(jalurBerkas)) {
        await fs.unlink(jalurBerkas);
        pencatat.debug({ jalur: jalurBerkas }, "Berkas sementara berhasil dibersihkan");
      }
    } catch (kesalahan) {
      pencatat.warn({ kesalahan, jalur: jalurBerkas }, "Gagal menghapus berkas sementara");
    }
  }

  public async bersihkanBerkasKedaluwarsa(
    usiaMaksimumMilidetik: number = 30 * 60 * 1000
  ): Promise<number> {
    let totalDihapus = 0;
    try {
      const daftarBerkas = await fs.readdir(this.direktoriSementara);
      const sekarang = Date.now();

      for (const namaBerkas of daftarBerkas) {
        if (namaBerkas === ".gitkeep") continue;

        const jalurLengkap = path.join(this.direktoriSementara, namaBerkas);
        try {
          const statistik = await fs.stat(jalurLengkap);
          if (statistik.isFile() && sekarang - statistik.mtimeMs > usiaMaksimumMilidetik) {
            await fs.unlink(jalurLengkap);
            totalDihapus++;
          }
        } catch {
        }
      }

      if (totalDihapus > 0) {
        pencatat.info(
          { totalDihapus },
          "Pembersihan berkas sementara kedaluwarsa selesai"
        );
      }
    } catch (kesalahan) {
      pencatat.error({ kesalahan }, "Gagal membaca direktori sementara untuk pembersihan");
    }

    return totalDihapus;
  }

  public async bungkusDenganPembersihan<T>(
    proses: (jalurSementara: string) => Promise<T>,
    ekstensi: string = "tmp"
  ): Promise<T> {
    const jalur = this.buatJalurSementara(ekstensi);
    try {
      return await proses(jalur);
    } finally {
      await this.bersihkanBerkas(jalur);
    }
  }
}

export const layananPenyimpananSementara = new LayananPenyimpananSementara();
