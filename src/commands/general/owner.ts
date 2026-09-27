import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { konfigurasiEnv } from "../../config/env.js";

export const perintahOwner: PerintahBot = {
  nama: "owner",
  alias: ["pemilik", "creator"],
  deskripsi: "Menampilkan kontak pemilik bot",
  kategori: "general",
  jalankan: async (konteks: KonteksPerintah) => {
    const idPemilik = konfigurasiEnv.idPemilikBot;
    if (!idPemilik) {
      await konteks.balas("Informasi pemilik bot belum dikonfigurasi.");
      return;
    }

    const nomorBersih = idPemilik.replace(/[^0-9]/g, "");
    await konteks.balas(
      `Kontak Pemilik Bot:\nNomor: wa.me/${nomorBersih}\nJID: ${idPemilik}`
    );
  },
};
