import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananStiker } from "../../services/media/sticker-service.js";

export const perintahTake: PerintahBot = {
  nama: "take",
  alias: ["colong", "wm"],
  deskripsi: "Mengubah metadata nama paket dan pembuat pada stiker",
  kategori: "sticker",
  jalankan: async (konteks: KonteksPerintah) => {
    const bufferMedia = await konteks.unduhMedia();
    if (!bufferMedia) {
      await konteks.balas("Balas stiker dengan !take <NamaPaket> | <NamaPembuat>");
      return;
    }

    const bagian = konteks.teksArgumen.split("|").map((item) => item.trim());
    const namaPaket = bagian[0] || "Anya Bot";
    const pembuat = bagian[1] || konteks.namaPengirim;

    try {
      const gambar = await layananStiker.stikerKeGambar(bufferMedia);
      const stikerBaru = await layananStiker.gambarKeStiker(gambar, {
        namaPaket,
        pembuat,
      });

      await konteks.soket.sendMessage(
        konteks.idObrolan,
        { sticker: stikerBaru },
        { quoted: konteks.pesanMentah }
      );
    } catch (kesalahan) {
      await konteks.balas("Gagal memperbarui metadata stiker.");
    }
  },
};
