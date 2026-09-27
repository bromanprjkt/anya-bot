import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananStiker } from "../../services/media/sticker-service.js";

export const perintahToImg: PerintahBot = {
  nama: "toimg",
  alias: ["togambar", "gambar"],
  deskripsi: "Mengubah stiker menjadi gambar format standar",
  kategori: "sticker",
  jalankan: async (konteks: KonteksPerintah) => {
    const bufferMedia = await konteks.unduhMedia();
    if (!bufferMedia) {
      await konteks.balas("Balas (reply) stiker yang ingin diubah menjadi gambar dengan !toimg");
      return;
    }

    await konteks.balas("Mengonversi stiker ke gambar...");

    try {
      const bufferGambar = await layananStiker.stikerKeGambar(bufferMedia);

      await konteks.soket.sendMessage(
        konteks.idObrolan,
        {
          image: bufferGambar,
          caption: "Berikut gambar hasil konversi stiker.",
        },
        { quoted: konteks.pesanMentah }
      );
    } catch (kesalahan) {
      await konteks.balas("Gagal mengonversi stiker ke gambar.");
    }
  },
};
