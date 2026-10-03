import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananAi } from "../../services/ai/ai-service.js";
import { bacaDokumenLampiran } from "../../services/ai/tools/document-reader.js";

export const perintahAi: PerintahBot = {
  nama: "ai",
  alias: ["tanya", "ask", "anya"],
  deskripsi: "Bertanya atau mengobrol dengan AI Anya",
  kategori: "general",
  jalankan: async (konteks: KonteksPerintah) => {
    let prompt = konteks.teksArgumen.trim();
    let gambarBase64: string[] | undefined;

    const mediaBuf = await konteks.unduhMedia().catch(() => null);
    if (mediaBuf) {
      const pesan = konteks.pesanMentah.message;
      const kutipan = pesan?.extendedTextMessage?.contextInfo?.quotedMessage;
      const adalahGambar = Boolean(pesan?.imageMessage || kutipan?.imageMessage);
      const adalahDokumen = Boolean(pesan?.documentMessage || kutipan?.documentMessage);

      if (adalahGambar) {
        const mime =
          pesan?.imageMessage?.mimetype ||
          kutipan?.imageMessage?.mimetype ||
          "image/jpeg";
        gambarBase64 = [`data:${mime};base64,${mediaBuf.toString("base64")}`];
        if (!prompt) {
          prompt = "Jelaskan atau baca isi dari gambar ini";
        }
      } else if (adalahDokumen) {
        const namaBerkas =
          pesan?.documentMessage?.fileName ||
          kutipan?.documentMessage?.fileName ||
          "dokumen";
        const mime =
          pesan?.documentMessage?.mimetype ||
          kutipan?.documentMessage?.mimetype ||
          "";
        const teksDokumen = await bacaDokumenLampiran(mediaBuf, namaBerkas, mime);
        if (teksDokumen) {
          prompt = `[Isi Dokumen "${namaBerkas}"]:\n${teksDokumen}\n\n${prompt || "Tolong baca dan analisis isi berkas dokumen di atas."}`;
        }
      }
    }

    if (!prompt) {
      await konteks.balas(
        "Ketik !ai <pertanyaan> atau kirim gambar/dokumen dengan perintah !ai untuk bertanya kepada Anya."
      );
      return;
    }

    try {
      if (typeof konteks.soket?.sendPresenceUpdate === "function") {
        await konteks.soket.sendPresenceUpdate("composing", konteks.idObrolan).catch(() => {});
      }

      const balasan = await layananAi.tanyaAi(
        konteks.idObrolan,
        prompt,
        konteks.namaPengirim,
        {
          adalahGrup: konteks.adalahGrup,
          idPengguna: konteks.idPengguna,
          gambarBase64,
          adalahPemilik: konteks.adalahPemilik,
          prioritas: 2,
          soket: konteks.soket,
        }
      );

      await konteks.balas(balasan);
    } catch {
      await konteks.balas(
        "Maaf Kak, Anya sedang tidak bisa menjawab saat ini. Coba lagi sebentar ya!"
      );
    }
  },
};
