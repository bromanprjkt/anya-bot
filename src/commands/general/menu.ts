import type { PerintahBot, RegistriPerintah, KategoriPerintah } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { periksaIzinPerintah } from "../../core/permissions.js";
import { konfigurasiEnv } from "../../config/env.js";

/**
 * Membuat perintah menu kontekstual yang ringkas dan hanya menampilkan
 * perintah yang berhak diakses oleh pengguna terkait.
 */
export function buatPerintahMenu(registri: RegistriPerintah): PerintahBot {
  return {
    nama: "menu",
    alias: ["bantuan"],
    deskripsi: "Menampilkan daftar perintah yang dapat Anda gunakan",
    kategori: "general",
    jalankan: async (konteks: KonteksPerintah) => {
      const awalan = konfigurasiEnv.awalanPerintah;
      const semuaPerintah = registri.ambilSemua();

      // Filter hanya perintah yang diizinkan untuk pengguna & konteks saat ini
      const perintahTersedia = semuaPerintah.filter(
        (perintah) => periksaIzinPerintah(perintah, konteks).diizinkan
      );

      // Urutan kategori yang logis dan rapi
      const urutanKategori: { kunci: KategoriPerintah; label: string }[] = [
        { kunci: "sticker", label: "Stiker & Media" },
        { kunci: "downloader", label: "Pengunduh" },
        { kunci: "group", label: "Alat Grup" },
        { kunci: "moderation", label: "Moderasi Grup" },
        { kunci: "general", label: "Umum" },
        { kunci: "admin", label: "Khusus Admin Bot" },
      ];

      let teksMenu = `*Anya Bot*\n`;
      teksMenu += `Awalan: \`${awalan}\`\n\n`;

      for (const kategori of urutanKategori) {
        const daftar = perintahTersedia.filter((p) => p.kategori === kategori.kunci);
        if (daftar.length === 0) continue;

        teksMenu += `*${kategori.label}*\n`;
        for (const p of daftar) {
          const aliasTeks = p.alias.length > 0 ? ` / ${awalan}${p.alias[0]}` : "";
          teksMenu += `› ${awalan}${p.nama}${aliasTeks}\n`;
        }
        teksMenu += `\n`;
      }

      teksMenu += `Ketik \`${awalan}help <nama_perintah>\` untuk petunjuk detail.`;

      await konteks.balas(teksMenu.trim());
    },
  };
}
