import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import os from "node:os";

function formatDurasi(detikTotal: number): string {
  const hari = Math.floor(detikTotal / (3600 * 24));
  const sisaHari = detikTotal % (3600 * 24);
  const jam = Math.floor(sisaHari / 3600);
  const sisaJam = sisaHari % 3600;
  const menit = Math.floor(sisaJam / 60);
  const detik = Math.floor(sisaJam % 60);

  const bagian: string[] = [];
  if (hari > 0) bagian.push(`${hari} hari`);
  if (jam > 0) bagian.push(`${jam} jam`);
  if (menit > 0) bagian.push(`${menit} menit`);
  bagian.push(`${detik} detik`);

  return bagian.join(" ");
}

export const perintahBotStats: PerintahBot = {
  nama: "botstats",
  alias: ["stats", "status"],
  deskripsi: "Menampilkan statistik dan performa sistem Anya Bot",
  kategori: "admin",
  hanyaPemilik: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const penggunaanMemori = process.memoryUsage();
    const rssMB = (penggunaanMemori.rss / 1024 / 1024).toFixed(2);
    const heapUsedMB = (penggunaanMemori.heapUsed / 1024 / 1024).toFixed(2);
    const heapTotalMB = (penggunaanMemori.heapTotal / 1024 / 1024).toFixed(2);

    const waktuAktif = formatDurasi(process.uptime());
    const waktuAktifSistem = formatDurasi(os.uptime());

    let statistik = `*──「 Statistik Anya Bot 」──*\n\n`;
    statistik += `• Waktu Aktif Bot: ${waktuAktif}\n`;
    statistik += `• Waktu Aktif OS: ${waktuAktifSistem}\n`;
    statistik += `• Memori RSS: ${rssMB} MB\n`;
    statistik += `• Heap Digunakan: ${heapUsedMB} / ${heapTotalMB} MB\n`;
    statistik += `• Platform: ${os.platform()} (${os.arch()})\n`;
    statistik += `• Node.js: ${process.version}`;

    await konteks.balas(statistik);
  },
};
