import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananStiker } from "../../services/media/sticker-service.js";

export const perintahQC: PerintahBot = {
  nama: "qc",
  alias: ["quote", "kutipan"],
  deskripsi: "Membuat stiker gelembung kutipan obrolan",
  kategori: "sticker",
  jalankan: async (konteks: KonteksPerintah) => {
    let teksKutipan = konteks.teksArgumen;
    let namaKutipan = konteks.namaPengirim;

    const kutipan = konteks.pesanMentah.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!teksKutipan && kutipan) {
      teksKutipan =
        kutipan.conversation ??
        kutipan.extendedTextMessage?.text ??
        "";
    }

    if (!teksKutipan) {
      await konteks.balas("Sertakan teks kutipan. Contoh: !qc Halo semuanya!");
      return;
    }

    await konteks.balas("Membuat stiker kutipan...");

    try {
      const bufferStiker = await layananStiker.buatStikerKutipan(
        teksKutipan,
        namaKutipan,
        {
          namaPaket: "Anya Bot QC",
          pembuat: namaKutipan,
        }
      );

      await konteks.soket.sendMessage(
        konteks.idObrolan,
        { sticker: bufferStiker },
        { quoted: konteks.pesanMentah }
      );
    } catch (kesalahan) {
      await konteks.balas("Gagal membuat stiker kutipan percakapan.");
    }
  },
};
