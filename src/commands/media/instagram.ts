import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import type { LayananPengunduh } from "../../services/downloader/downloader-adapter.js";

/**
 * Membuat perintah Instagram downloader yang terhubung ke layanan pengunduh.
 */
export function buatPerintahInstagram(layanan: LayananPengunduh): PerintahBot {
  return {
    nama: "instagram",
    alias: ["ig", "igdl"],
    deskripsi: "Mengunduh video/foto Reels atau Post Instagram",
    kategori: "downloader",
    jalankan: async (konteks: KonteksPerintah) => {
      const tautan = konteks.argumen[0];

      if (!tautan || !tautan.includes("instagram.com")) {
        await konteks.balas("Sertakan tautan Instagram yang valid.\nContoh: !ig https://www.instagram.com/reel/xxxx/");
        return;
      }

      await konteks.balas("Sedang memproses unduhan Instagram. Tunggu sebentar...");

      const hasil = await layanan.unduhMedia(tautan);
      if (!hasil.berhasil || !hasil.urlMedia) {
        await konteks.balas(
          hasil.pesanKesalahan ?? "Gagal mengunduh media Instagram. Pastikan akun tidak diprivat."
        );
        return;
      }

      try {
        const buffer = await layanan.ambilBufferMedia(hasil.urlMedia);
        const adalahVideo = (hasil.tipeMime ?? "").includes("video");
        const keterangan = hasil.judul
          ? `*Instagram*: ${hasil.judul}`
          : `Berhasil mengunduh ${adalahVideo ? "video" : "foto"} Instagram.`;

        if (adalahVideo) {
          await konteks.soket.sendMessage(
            konteks.idObrolan,
            {
              video: buffer,
              caption: keterangan,
              mimetype: hasil.tipeMime ?? "video/mp4",
            },
            { quoted: konteks.pesanMentah }
          );
        } else {
          await konteks.soket.sendMessage(
            konteks.idObrolan,
            {
              image: buffer,
              caption: keterangan,
              mimetype: hasil.tipeMime ?? "image/jpeg",
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
