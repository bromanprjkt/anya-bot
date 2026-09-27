import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";

export const perintahTagAll: PerintahBot = {
  nama: "tagall",
  alias: ["everyone", "semua"],
  deskripsi: "Menyebut seluruh anggota grup WhatsApp",
  kategori: "group",
  hanyaGrup: true,
  membutuhkanAdmin: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const metadata = await konteks.soket.groupMetadata(konteks.idObrolan);
    const daftarPeserta = metadata.participants.map((peserta) => peserta.id);

    const pesanKustom = konteks.teksArgumen ? `${konteks.teksArgumen}\n\n` : "";
    let teksBalasan = `*Panggilan Anggota Grup: ${metadata.subject}*\n${pesanKustom}`;

    for (const jid of daftarPeserta) {
      const nomor = jid.split("@")[0];
      teksBalasan += `• @${nomor}\n`;
    }

    await konteks.soket.sendMessage(
      konteks.idObrolan,
      {
        text: teksBalasan.trim(),
        mentions: daftarPeserta,
      },
      { quoted: konteks.pesanMentah }
    );
  },
};
