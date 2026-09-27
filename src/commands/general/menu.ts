import fs from "node:fs";
import path from "node:path";
import type { PerintahBot, RegistriPerintah, KategoriPerintah } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { periksaIzinPerintah } from "../../core/permissions.js";
import { konfigurasiEnv } from "../../config/env.js";

const URL_BANNER =
  "https://raw.githubusercontent.com/bromanprjkt/anya-bot/refs/heads/main/banner.png";
const JALUR_BANNER_LOKAL = path.resolve(process.cwd(), "banner.png");
let memoriBufferBanner: Buffer | null = null;

/**
 * Mengambil buffer banner bot baik dari berkas lokal atau unduhan online.
 */
async function ambilBufferBanner(): Promise<Buffer | null> {
  if (memoriBufferBanner) {
    return memoriBufferBanner;
  }

  // Prioritaskan berkas lokal jika tersedia
  if (fs.existsSync(JALUR_BANNER_LOKAL)) {
    try {
      memoriBufferBanner = fs.readFileSync(JALUR_BANNER_LOKAL);
      return memoriBufferBanner;
    } catch {
      // Abaikan jika berkas lokal tidak dapat dibaca
    }
  }

  // Unduh dari URL online jika berkas lokal belum ada
  try {
    const respon = await fetch(URL_BANNER);
    if (respon.ok) {
      const buffer = Buffer.from(await respon.arrayBuffer());
      memoriBufferBanner = buffer;
      return buffer;
    }
  } catch {
    // Abaikan jika unduhan gagal
  }

  return null;
}

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

      const bufferBanner = await ambilBufferBanner();

      if (bufferBanner && typeof konteks.soket?.sendMessage === "function") {
        try {
          await konteks.soket.sendMessage(
            konteks.idObrolan,
            {
              image: bufferBanner,
              caption: teksMenu.trim(),
            },
            { quoted: konteks.pesanMentah }
          );
          return;
        } catch {
          // Fallback ke pesan teks jika gagal mengirim gambar
        }
      }

      await konteks.balas(teksMenu.trim());
    },
  };
}
