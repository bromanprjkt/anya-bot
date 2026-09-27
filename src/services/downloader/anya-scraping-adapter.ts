import path from "node:path";
import { buatPencatat } from "../../utils/logger.js";
import type { HasilUnduhan, PenyediaPengunduh } from "./downloader-adapter.js";

const pencatat = buatPencatat("PenyediaScrapingAnya");

/**
 * Penyedia pengunduh yang mengintegrasikan scraper lokal Anya (TikTok & Instagram).
 * Menjalankan modul scraper langsung tanpa perantara server HTTP.
 */
export class PenyediaScrapingAnya implements PenyediaPengunduh {
  public readonly nama = "PenyediaScrapingAnya";

  constructor() {}

  public cocokUrl(tautan: string): boolean {
    const tautanKecil = tautan.toLowerCase();
    return (
      tautanKecil.includes("tiktok.com") ||
      tautanKecil.includes("douyin.com") ||
      tautanKecil.includes("instagram.com")
    );
  }

  public async unduh(tautan: string): Promise<HasilUnduhan> {
    const tautanKecil = tautan.toLowerCase();

    if (tautanKecil.includes("tiktok.com") || tautanKecil.includes("douyin.com")) {
      return await this.unduhTikTok(tautan);
    }

    if (tautanKecil.includes("instagram.com")) {
      return await this.unduhInstagram(tautan);
    }

    return {
      berhasil: false,
      pesanKesalahan: "Format URL tidak didukung oleh modul pengunduh Anya.",
    };
  }

  /**
   * Mengunduh media TikTok (video tanpa watermark atau slide foto).
   */
  private async unduhTikTok(tautan: string): Promise<HasilUnduhan> {
    try {
      const jalurModulScraper = path.resolve(process.cwd(), "anya-scraping", "scraper.js");
      const { tiktokDownloaderVideo } = await import(jalurModulScraper);

      const hasilScraping = await tiktokDownloaderVideo(tautan);
      if (hasilScraping && hasilScraping.data) {
        const itemVideo =
          hasilScraping.data.find((item: { type: string }) => item.type === "nowatermark_hd") ??
          hasilScraping.data.find((item: { type: string }) => item.type === "nowatermark") ??
          hasilScraping.data[0];

        if (itemVideo?.url) {
          const adalahFoto = itemVideo.type === "photo";
          return {
            berhasil: true,
            urlMedia: itemVideo.url,
            tipeMime: adalahFoto ? "image/jpeg" : "video/mp4",
            judul: hasilScraping.title,
          };
        }
      }

      return {
        berhasil: false,
        pesanKesalahan: "Gagal menemukan tautan unduhan video dari TikTok.",
      };
    } catch (kesalahan) {
      const pesanError = kesalahan instanceof Error ? kesalahan.message : String(kesalahan);
      pencatat.error({ kesalahan: pesanError }, "Kesalahan eksekusi scraper TikTok Anya");
      return {
        berhasil: false,
        pesanKesalahan: "Gagal memproses video TikTok. Pastikan akun atau video tidak diprivat.",
      };
    }
  }

  /**
   * Mengunduh media Instagram (video Reels atau postingan foto).
   */
  private async unduhInstagram(tautan: string): Promise<HasilUnduhan> {
    try {
      const jalurModulScraper = path.resolve(process.cwd(), "anya-scraping", "scraper.js");
      const { Instagram } = await import(jalurModulScraper);

      const hasilScraping = await Instagram(tautan);
      if (hasilScraping && hasilScraping.url) {
        const urlMedia = Array.isArray(hasilScraping.url)
          ? hasilScraping.url[0]
          : hasilScraping.url;

        if (urlMedia) {
          const adalahVideo = Boolean(hasilScraping.metadata?.isVideo ?? true);
          return {
            berhasil: true,
            urlMedia,
            tipeMime: adalahVideo ? "video/mp4" : "image/jpeg",
            judul: hasilScraping.metadata?.caption,
          };
        }
      }

      return {
        berhasil: false,
        pesanKesalahan: hasilScraping?.msg ?? "Gagal mendapatkan media Instagram.",
      };
    } catch (kesalahan) {
      const pesanError = kesalahan instanceof Error ? kesalahan.message : String(kesalahan);
      pencatat.error({ kesalahan: pesanError }, "Kesalahan eksekusi scraper Instagram Anya");
      return {
        berhasil: false,
        pesanKesalahan: "Gagal memproses media Instagram. Pastikan akun tidak diprivat.",
      };
    }
  }
}
