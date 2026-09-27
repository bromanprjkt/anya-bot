import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananStiker } from "../../services/media/sticker-service.js";

export const perintahTake: PerintahBot = {
  nama: "take",
  alias: ["colong"],
  deskripsi: "Mengambil dan mengubah stiker menjadi foto",
  kategori: "sticker",
  jalankan: async (konteks: KonteksPerintah) => {
    const bufferMedia = await konteks.unduhMedia();
    if (!bufferMedia) {
      await konteks.balas("Balas (reply) stiker yang ingin diambil menjadi foto dengan !take atau !colong");
      return;
    }

    try {
      const bufferFoto = await layananStiker.stikerKeGambar(bufferMedia);

      await konteks.soket.sendMessage(
        konteks.idObrolan,
        {
          image: bufferFoto,
          caption: "Berikut foto hasil konversi stiker.",
        },
        { quoted: konteks.pesanMentah }
      );
    } catch (kesalahan) {
      await konteks.balas("Gagal mengambil stiker menjadi foto.");
    }
  },
};
