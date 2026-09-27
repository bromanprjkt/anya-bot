import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";

export const perintahPing: PerintahBot = {
  nama: "ping",
  alias: ["p", "speed"],
  deskripsi: "Mengecek kecepatan respon bot",
  kategori: "general",
  jalankan: async (konteks: KonteksPerintah) => {
    const waktuMulai = Date.now();
    const waktuPesan = Number(konteks.pesanMentah.messageTimestamp ?? 0) * 1000;
    const jedaPesan = waktuPesan > 0 ? waktuMulai - waktuPesan : 0;

    const waktuSelesai = Date.now();
    const latensi = waktuSelesai - waktuMulai;

    let balasan = `Pong!\nKecepatan respon: ${latensi} ms`;
    if (jedaPesan > 0) {
      balasan += `\nJeda pengiriman: ${jedaPesan} ms`;
    }

    await konteks.balas(balasan);
  },
};
