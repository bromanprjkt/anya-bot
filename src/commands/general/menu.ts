import type { PerintahBot, RegistriPerintah } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { konfigurasiEnv } from "../../config/env.js";

/**
 * Membuat perintah menu yang terikat dengan registri perintah aktif.
 */
export function buatPerintahMenu(registri: RegistriPerintah): PerintahBot {
  return {
    nama: "menu",
    alias: ["help", "bantuan"],
    deskripsi: "Menampilkan daftar seluruh perintah yang tersedia",
    kategori: "general",
    jalankan: async (konteks: KonteksPerintah) => {
      const kelompokKategori = registri.ambilBerdasarkanKategori();
      const awalan = konfigurasiEnv.awalanPerintah;

      const judulKategori: Record<string, string> = {
        general: "Umum",
        sticker: "Stiker & Media",
        group: "Alat Grup",
        moderation: "Moderasi",
        admin: "Admin Bot",
        downloader: "Pengunduh Media",
      };

      let teksMenu = `Halo @${konteks.idPengguna.split("@")[0]}!\n`;
      teksMenu += `Berikut daftar perintah Anya Bot:\n\n`;

      for (const [kategori, daftarPerintah] of kelompokKategori.entries()) {
        const judul = judulKategori[kategori] ?? kategori.toUpperCase();
        teksMenu += `*──「 ${judul} 」──*\n`;
        for (const perintah of daftarPerintah) {
          teksMenu += `• ${awalan}${perintah.nama} — ${perintah.deskripsi}\n`;
        }
        teksMenu += `\n`;
      }

      teksMenu += `Gunakan ${awalan}help <nama_perintah> untuk melihat detail bantuan.`;

      await konteks.balas(teksMenu.trim());
    },
  };
}
