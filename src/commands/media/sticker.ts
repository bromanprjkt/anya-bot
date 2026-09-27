import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananStiker } from "../../services/media/sticker-service.js";
import { antreanPekerjaanMedia } from "../../services/queue/job-queue.js";

export const perintahSticker: PerintahBot = {
  nama: "sticker",
  alias: ["s", "stiker"],
  deskripsi: "Mengubah gambar atau video menjadi stiker WhatsApp",
  kategori: "sticker",
  jalankan: async (konteks: KonteksPerintah) => {
    const bufferMedia = await konteks.unduhMedia();
    if (!bufferMedia) {
      await konteks.balas(
        "Kirim gambar/video dengan caption !sticker, atau balas (reply) media yang ingin diubah."
      );
      return;
    }

    const isi = konteks.pesanMentah.message;
    const kutipan = isi?.extendedTextMessage?.contextInfo?.quotedMessage;

    const adalahVideo = Boolean(
      isi?.videoMessage || kutipan?.videoMessage
    );

    await konteks.balas("Sedang memproses stiker...");

    try {
      const bufferStiker = await antreanPekerjaanMedia.antrekanPekerjaan(
        `KonversiStiker_${konteks.idPengguna}`,
        async () => {
          if (adalahVideo) {
            return await layananStiker.videoKeStikerAnimasi(bufferMedia, {
              namaPaket: "Anya Bot",
              pembuat: "github@bromanprjkt",
            });
          }
          return await layananStiker.gambarKeStiker(bufferMedia, {
            namaPaket: "Anya Bot",
            pembuat: "github@bromanprjkt",
          });
        }
      );

      await konteks.soket.sendMessage(
        konteks.idObrolan,
        { sticker: bufferStiker },
        { quoted: konteks.pesanMentah }
      );
    } catch (kesalahan) {
      await konteks.balas(
        "Gagal membuat stiker. Pastikan media yang dikirim berupa gambar atau video yang didukung."
      );
    }
  },
};
