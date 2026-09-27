import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananStiker } from "../../services/media/sticker-service.js";

export const perintahTTP: PerintahBot = {
  nama: "ttp",
  alias: ["steks", "teks", "text"],
  deskripsi: "Membuat stiker teks dari kata atau pesan",
  kategori: "sticker",
  jalankan: async (konteks: KonteksPerintah) => {
    let teksMasukan = konteks.teksArgumen.trim();

    const kutipan =
      konteks.pesanMentah.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    if (!teksMasukan && kutipan) {
      teksMasukan = (
        kutipan.conversation ??
        kutipan.extendedTextMessage?.text ??
        ""
      ).trim();
    }

    if (!teksMasukan) {
      await konteks.balas(
        "Sertakan teks atau balas pesan teks untuk membuat stiker. Contoh: !ttp sekali liat langsung #minat"
      );
      return;
    }

    await konteks.balas("Membuat stiker teks...");

    try {
      const bufferStiker = await layananStiker.buatStikerTeks(teksMasukan, {
        namaPaket: "Anya Bot",
        pembuat: "github@bromanprjkt",
      });

      await konteks.soket.sendMessage(
        konteks.idObrolan,
        { sticker: bufferStiker },
        { quoted: konteks.pesanMentah }
      );
    } catch (kesalahan) {
      await konteks.balas("Gagal membuat stiker teks.");
    }
  },
};
