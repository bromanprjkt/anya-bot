import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import type { LayananPengunduh } from "../../services/downloader/downloader-adapter.js";

/**
 * Membuat perintah TikTok downloader yang terhubung ke layanan pengunduh.
 */
export function buatPerintahTikTok(layanan: LayananPengunduh): PerintahBot {
  return {
    nama: "tiktok",
    alias: ["tt", "ttdl"],
    deskripsi: "Mengunduh video TikTok tanpa tanda air (watermark)",
    kategori: "downloader",
    jalankan: async (konteks: KonteksPerintah) => {
      const tautan = konteks.argumen[0];

      if (!tautan || (!tautan.includes("tiktok.com") && !tautan.includes("douyin.com"))) {
        await konteks.balas("Sertakan tautan TikTok yang valid.\nContoh: !tt https://vt.tiktok.com/xxxx/");
        return;
      }

      await konteks.balas("Sedang memproses unduhan video TikTok. Tunggu sebentar...");

      const hasil = await layanan.unduhMedia(tautan);
      if (!hasil.berhasil || !hasil.urlMedia) {
        await konteks.balas(
          hasil.pesanKesalahan ?? "Gagal mengunduh video TikTok. Pastikan video bersifat publik."
        );
        return;
      }

      try {
        const buffer = await layanan.ambilBufferMedia(hasil.urlMedia);
        const adalahFoto = (hasil.tipeMime ?? "").includes("image");
        const keterangan = hasil.judul
          ? `*TikTok*: ${hasil.judul}`
          : "Berhasil mengunduh media TikTok.";

        if (adalahFoto) {
          await konteks.soket.sendMessage(
            konteks.idObrolan,
            {
              image: buffer,
              caption: keterangan,
              mimetype: hasil.tipeMime ?? "image/jpeg",
            },
            { quoted: konteks.pesanMentah }
          );
        } else {
          await konteks.soket.sendMessage(
            konteks.idObrolan,
            {
              video: buffer,
              caption: keterangan,
              mimetype: hasil.tipeMime ?? "video/mp4",
            },
            { quoted: konteks.pesanMentah }
          );
        }
      } catch (kesalahan) {
        await konteks.balas("Gagal mentransfer berkas media ke WhatsApp.");
      }
    },
  };
}
