import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { repositoriPeringatan } from "../../repositories/warning-repository.js";

export const perintahWarn: PerintahBot = {
  nama: "warn",
  alias: ["peringatan"],
  deskripsi: "Memberikan peringatan pelanggaran kepada anggota grup",
  kategori: "moderation",
  hanyaGrup: true,
  membutuhkanAdmin: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const infoKonteks = konteks.pesanMentah.message?.extendedTextMessage?.contextInfo;
    const targetMention = infoKonteks?.mentionedJid?.[0];
    const targetKutipan = infoKonteks?.participant;

    const targetJid = targetMention ?? targetKutipan;
    if (!targetJid) {
      await konteks.balas("Sebutkan (tag) pengguna atau balas pesannya untuk memberi peringatan.\nContoh: !warn @user Spam pesan");
      return;
    }

    const alasan = konteks.argumen.slice(1).join(" ") || "Pelanggaran aturan grup";
    repositoriPeringatan.tambahPeringatan(
      konteks.idObrolan,
      targetJid,
      alasan,
      konteks.idPengguna
    );

    const totalPeringatan = repositoriPeringatan.hitungTotalPeringatan(
      konteks.idObrolan,
      targetJid
    );

    const nomorTarget = targetJid.split("@")[0];
    let balasan = `⚠️ *Peringatan Diberikan*\n`;
    balasan += `Kepada: @${nomorTarget}\n`;
    balasan += `Alasan: ${alasan}\n`;
    balasan += `Total Peringatan: ${totalPeringatan}/3`;

    if (totalPeringatan >= 3) {
      balasan += `\n\nPengguna telah mencapai batas 3 peringatan!`;
    }

    await konteks.soket.sendMessage(
      konteks.idObrolan,
      {
        text: balasan,
        mentions: [targetJid],
      },
      { quoted: konteks.pesanMentah }
    );
  },
};
