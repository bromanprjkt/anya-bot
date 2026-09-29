import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { layananAi } from "../../services/ai/ai-service.js";

export const perintahAi: PerintahBot = {
  nama: "ai",
  alias: ["tanya", "ask", "anya"],
  deskripsi: "Bertanya atau mengobrol dengan AI Anya",
  kategori: "general",
  jalankan: async (konteks: KonteksPerintah) => {
    const prompt = konteks.teksArgumen.trim();

    if (!prompt) {
      await konteks.balas(
        "Ketik !ai <pertanyaan> untuk mengobrol dengan Anya.\nContoh: !ai kamu lagi apa?"
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
        konteks.namaPengirim
      );

      await konteks.balas(balasan);
    } catch {
      await konteks.balas(
        "Maaf Kak, Anya sedang tidak bisa menjawab saat ini. Coba lagi sebentar ya!"
      );
    }
  },
};
