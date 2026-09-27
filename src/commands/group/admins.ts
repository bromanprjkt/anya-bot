import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";

export const perintahAdmins: PerintahBot = {
  nama: "admins",
  alias: ["admin", "daftaradmin"],
  deskripsi: "Menampilkan daftar seluruh admin dalam grup",
  kategori: "group",
  hanyaGrup: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const metadata = await konteks.soket.groupMetadata(konteks.idObrolan);
    const daftarAdmin = metadata.participants.filter(
      (peserta) => peserta.admin === "admin" || peserta.admin === "superadmin"
    );

    const jidAdmin = daftarAdmin.map((peserta) => peserta.id);
    let teksBalasan = `*Daftar Admin Grup: ${metadata.subject}*\n\n`;

    for (const admin of daftarAdmin) {
      const nomor = admin.id.split("@")[0];
      const tipe = admin.admin === "superadmin" ? "Pembuat/Superadmin" : "Admin";
      teksBalasan += `• @${nomor} (${tipe})\n`;
    }

    await konteks.soket.sendMessage(
      konteks.idObrolan,
      {
        text: teksBalasan.trim(),
        mentions: jidAdmin,
      },
      { quoted: konteks.pesanMentah }
    );
  },
};
