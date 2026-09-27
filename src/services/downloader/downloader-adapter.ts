import { buatPencatat } from "../../utils/logger.js";
import type { KonfigurasiEnv } from "../../config/env.js";

const pencatat = buatPencatat("LayananPengunduh");

export interface HasilUnduhan {
  berhasil: boolean;
  urlMedia?: string;
  namaFile?: string;
  tipeMime?: string;
  pesanKesalahan?: string;
}

export interface PenyediaPengunduh {
  readonly nama: string;
  cocokUrl: (tautan: string) => boolean;
  unduh: (tautan: string) => Promise<HasilUnduhan>;
}

/**
 * Penyedia pengunduh berbasis HTTP API scraper eksternal kustom.
 */
export class PenyediaApiEksternal implements PenyediaPengunduh {
  public readonly nama = "ScraperApiEksternal";

  constructor(private readonly konfigurasi: KonfigurasiEnv) {}

  public cocokUrl(tautan: string): boolean {
    const tautanKecil = tautan.toLowerCase();
    return (
      tautanKecil.includes("tiktok.com") ||
      tautanKecil.includes("douyin.com") ||
      tautanKecil.includes("instagram.com")
    );
  }

  public async unduh(tautan: string): Promise<HasilUnduhan> {
    const urlApi = this.konfigurasi.urlApiPengunduh;
    const kunciApi = this.konfigurasi.kunciApiPengunduh;

    if (!urlApi) {
      return {
        berhasil: false,
        pesanKesalahan: "Layanan API pengunduh eksternal belum dikonfigurasi pada server.",
      };
    }

    pencatat.info({ tautan, urlApi }, "Mengirim permintaan unduhan ke API eksternal");

    try {
      const tajuk: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (kunciApi) {
        tajuk["Authorization"] = `Bearer ${kunciApi}`;
      }

      const respon = await fetch(urlApi, {
        method: "POST",
        headers: tajuk,
        body: JSON.stringify({ url: tautan }),
      });

      if (!respon.ok) {
        pencatat.warn(
          { status: respon.status, statusText: respon.statusText },
          "API pengunduh mengembalikan respon non-200"
        );
        return {
          berhasil: false,
          pesanKesalahan: `Server scraper merespon dengan status ${respon.status}`,
        };
      }

      const hasilJson = (await respon.json()) as {
        success?: boolean;
        mediaUrl?: string;
        url?: string;
        mimeType?: string;
        fileName?: string;
        error?: string;
      };

      const urlMedia = hasilJson.mediaUrl ?? hasilJson.url;

      if (!hasilJson.success && !urlMedia) {
        return {
          berhasil: false,
          pesanKesalahan: hasilJson.error ?? "Gagal mendapatkan tautan media dari scraper.",
        };
      }

      return {
        berhasil: true,
        urlMedia,
        tipeMime: hasilJson.mimeType ?? "video/mp4",
        namaFile: hasilJson.fileName,
      };
    } catch (kesalahan) {
      pencatat.error({ kesalahan }, "Kesalahan jaringan saat memanggil scraper API");
      return {
        berhasil: false,
        pesanKesalahan: "Gagal terhubung ke layanan scraper eksternal.",
      };
    }
  }
}

/**
 * Layanan utama pengunduh media yang mengorkestrasi berbagai adapter penyedia.
 */
export class LayananPengunduh {
  private readonly daftarPenyedia: PenyediaPengunduh[] = [];

  constructor() {}

  public daftarkanPenyedia(penyedia: PenyediaPengunduh): void {
    this.daftarPenyedia.push(penyedia);
    pencatat.debug({ penyedia: penyedia.nama }, "Penyedia pengunduh berhasil didaftarkan");
  }

  /**
   * Menemukan penyedia yang cocok dan mengunduh media.
   */
  public async unduhMedia(tautan: string): Promise<HasilUnduhan> {
    const penyediaCocok = this.daftarPenyedia.find((p) => p.cocokUrl(tautan));

    if (!penyediaCocok) {
      return {
        berhasil: false,
        pesanKesalahan: "Format tautan tidak didukung oleh layanan pengunduh saat ini.",
      };
    }

    return await penyediaCocok.unduh(tautan);
  }

  /**
   * Mengambil file biner dari URL media yang diberikan.
   */
  public async ambilBufferMedia(urlMedia: string): Promise<Buffer> {
    const respon = await fetch(urlMedia);
    if (!respon.ok) {
      throw new Error(`Gagal mengunduh biner media: ${respon.status} ${respon.statusText}`);
    }

    const larikArray = await respon.arrayBuffer();
    return Buffer.from(larikArray);
  }
}
