import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { PerintahBot, RegistriPerintah, KategoriPerintah } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { periksaIzinPerintah } from "../../core/permissions.js";
import { konfigurasiEnv } from "../../config/env.js";

const URL_BANNER =
  "https://raw.githubusercontent.com/bromanprjkt/anya-bot/refs/heads/main/banner.png";
const JALUR_BANNER_LOKAL = path.resolve(process.cwd(), "banner.png");

let bufferBannerMemori: Buffer | null = null;

async function ambilBufferBanner(): Promise<Buffer | undefined> {
  if (bufferBannerMemori) return bufferBannerMemori;
  try {
    let bufferMentah: Buffer | null = null;
    if (fs.existsSync(JALUR_BANNER_LOKAL)) {
      bufferMentah = fs.readFileSync(JALUR_BANNER_LOKAL);
    } else {
      const respon = await fetch(URL_BANNER);
      if (respon.ok) {
        bufferMentah = Buffer.from(await respon.arrayBuffer());
      }
    }

    if (bufferMentah) {
      bufferBannerMemori = await sharp(bufferMentah)
        .resize(300, 168, { fit: "cover" })
        .jpeg({ quality: 65 })
        .toBuffer();
      return bufferBannerMemori;
    }
  } catch {
  }
  return undefined;
}

export function buatPerintahMenu(registri: RegistriPerintah): PerintahBot {
  return {
    nama: "menu",
    alias: ["help", "bantuan"],
    deskripsi: "Menampilkan daftar perintah yang dapat Anda gunakan",
    kategori: "general",
    jalankan: async (konteks: KonteksPerintah) => {
      const awalan = konfigurasiEnv.awalanPerintah;
      const semuaPerintah = registri.ambilSemua();

      const perintahTersedia = semuaPerintah.filter(
        (perintah) => periksaIzinPerintah(perintah, konteks).diizinkan
      );

      const urutanKategori: { kunci: KategoriPerintah; label: string }[] = [
        { kunci: "sticker", label: "Stiker & Media" },
        { kunci: "downloader", label: "Pengunduh" },
        { kunci: "group", label: "Alat Grup" },
        { kunci: "moderation", label: "Moderasi Grup" },
        { kunci: "general", label: "Umum" },
        { kunci: "admin", label: "Khusus Admin Bot" },
      ];

      let teksMenu = `*Anya Bot* (v${konfigurasiEnv.versiBot})\n`;
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

      teksMenu += `Gunakan awalan \`${awalan}\` di depan nama perintah.`;

      if (typeof konteks.soket?.sendMessage === "function") {
        try {
          const bufferBanner = await ambilBufferBanner();
          await konteks.soket.sendMessage(
            konteks.idObrolan,
            {
              text: teksMenu.trim(),
              contextInfo: {
                externalAdReply: {
                  title: `Anya Bot (v${konfigurasiEnv.versiBot})`,
                  body: "bromanprjkt • mau jadi bos",
                  mediaType: 1,
                  thumbnailUrl: URL_BANNER,
                  ...(bufferBanner ? { thumbnail: bufferBanner } : {}),
                  sourceUrl: "https://github.com/bromanprjkt/anya-bot",
                  renderLargerThumbnail: true,
                },
              },
            },
            { quoted: konteks.pesanMentah }
          );
          return;
        } catch {
        }
      }

      await konteks.balas(teksMenu.trim());
    },
  };
}
