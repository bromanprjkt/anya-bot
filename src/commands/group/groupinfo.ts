import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";

export const perintahGroupInfo: PerintahBot = {
  nama: "groupinfo",
  alias: ["infogrup", "gcinfo"],
  deskripsi: "Menampilkan informasi lengkap mengenai grup",
  kategori: "group",
  hanyaGrup: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const metadata = await konteks.soket.groupMetadata(konteks.idObrolan);

    const totalPeserta = metadata.participants.length;
    const totalAdmin = metadata.participants.filter(
      (p) => p.admin === "admin" || p.admin === "superadmin"
    ).length;

    const tanggalDibuat = metadata.creation
      ? new Date(metadata.creation * 1000).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "Tidak diketahui";

    let teks = `*──「 Informasi Grup 」──*\n\n`;
    teks += `• Nama: ${metadata.subject}\n`;
    teks += `• ID Grup: ${metadata.id}\n`;
    teks += `• Dibuat Pada: ${tanggalDibuat}\n`;
    teks += `• Total Peserta: ${totalPeserta}\n`;
    teks += `• Total Admin: ${totalAdmin}\n`;
    if (metadata.desc) {
      teks += `\n*Deskripsi:*\n${metadata.desc}`;
    }

    await konteks.balas(teks.trim());
  },
};
