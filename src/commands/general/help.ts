import type { PerintahBot, RegistriPerintah } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { konfigurasiEnv } from "../../config/env.js";

/**
 * Membuat perintah bantuan terperinci per perintah.
 */
export function buatPerintahHelp(registri: RegistriPerintah): PerintahBot {
  return {
    nama: "help",
    alias: ["info"],
    deskripsi: "Melihat petunjuk penggunaan perintah tertentu",
    kategori: "general",
    jalankan: async (konteks: KonteksPerintah) => {
      const target = konteks.argumen[0]?.toLowerCase();
      const awalan = konfigurasiEnv.awalanPerintah;

      if (!target) {
        const perintahMenu = registri.cariPerintah("menu");
        if (perintahMenu) {
          await perintahMenu.jalankan(konteks);
          return;
        }
        await konteks.balas(`Gunakan ${awalan}menu untuk melihat semua perintah.`);
        return;
      }

      const perintah = registri.cariPerintah(target);
      if (!perintah) {
        await konteks.balas(`Perintah "${target}" tidak ditemukan. Gunakan ${awalan}menu.`);
        return;
      }

      let info = `*Bantuan Perintah: ${awalan}${perintah.nama}*\n\n`;
      info += `Deskripsi: ${perintah.deskripsi}\n`;
      if (perintah.alias.length > 0) {
        info += `Alias: ${perintah.alias.map((a) => `${awalan}${a}`).join(", ")}\n`;
      }
      info += `Kategori: ${perintah.kategori}\n`;
      info += `Khusus Grup: ${perintah.hanyaGrup ? "Ya" : "Tidak"}\n`;
      info += `Khusus Admin: ${perintah.membutuhkanAdmin ? "Ya" : "Tidak"}\n`;
      info += `Khusus Pemilik: ${perintah.hanyaPemilik ? "Ya" : "Tidak"}`;

      await konteks.balas(info);
    },
  };
}
