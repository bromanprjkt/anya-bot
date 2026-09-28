import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananStiker } from "../../services/media/sticker-service.js";
import { antreanPekerjaanMedia } from "../../services/queue/job-queue.js";

export const perintahSmeme: PerintahBot = {
  nama: "smeme",
  alias: ["stickermeme", "stikermeme"],
  deskripsi: "Membuat stiker meme dengan teks atas dan bawah dari gambar atau stiker",
  kategori: "sticker",
  jalankan: async (konteks: KonteksPerintah) => {
    const argumenMentah = konteks.teksArgumen.trim();

    if (!argumenMentah) {
      await konteks.balas(
        "Sertakan teks meme dengan format: !smeme teks atas | teks bawah\nContoh: !smeme ketika ngoding | langsung jalan"
      );
      return;
    }

    let teksAtas = "";
    let teksBawah = "";

    if (argumenMentah.includes("|")) {
      const [bagianAtas, ...bagianBawah] = argumenMentah.split("|");
      teksAtas = (bagianAtas ?? "").trim();
      teksBawah = bagianBawah.join("|").trim();
    } else {
      teksAtas = argumenMentah;
    }

    if (!teksAtas && !teksBawah) {
      await konteks.balas(
        "Sertakan teks meme dengan format: !smeme teks atas | teks bawah\nContoh: !smeme ketika ngoding | langsung jalan"
      );
      return;
    }

    const bufferMedia = await konteks.unduhMedia();
    if (!bufferMedia) {
      await konteks.balas(
        "Kirim gambar dengan caption !smeme atau balas (reply) gambar/stiker yang ingin dijadikan meme."
      );
      return;
    }

    const isi = konteks.pesanMentah.message;
    const kutipan = isi?.extendedTextMessage?.contextInfo?.quotedMessage;
    const adalahStiker = Boolean(
      isi?.stickerMessage ||
      kutipan?.stickerMessage ||
      konteks.pesanKutipan?.adalahStiker
    );

    await konteks.balas("Sedang memproses stiker meme...");

    try {
      const bufferStiker = await antreanPekerjaanMedia.antrekanPekerjaan(
        `StikerMeme_${konteks.idPengguna}`,
        async () => {
          let bufferGambar = bufferMedia;
          if (adalahStiker) {
            bufferGambar = await layananStiker.stikerKeGambar(bufferMedia);
          }

          return await layananStiker.buatStikerMeme(bufferGambar, teksAtas, teksBawah, {
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
        "Gagal membuat stiker meme. Pastikan media yang dikirim berupa gambar atau stiker yang didukung."
      );
    }
  },
};
