import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { repositoriPeringatan } from "../../repositories/warning-repository.js";

export const perintahWarnings: PerintahBot = {
  nama: "warnings",
  alias: ["cekperingatan", "listwarn"],
  deskripsi: "Melihat daftar riwayat atau mereset peringatan anggota grup",
  kategori: "moderation",
  hanyaGrup: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const infoKonteks = konteks.pesanMentah.message?.extendedTextMessage?.contextInfo;
    const targetMention = infoKonteks?.mentionedJid?.[0];
    const targetKutipan = infoKonteks?.participant;

    const targetJid = targetMention ?? targetKutipan ?? konteks.idPengguna;
    const nomorTarget = targetJid.split("@")[0];

    const aksi = konteks.argumen[0]?.toLowerCase();
    if (aksi === "reset" || aksi === "hapus") {
      if (!konteks.adalahAdmin && !konteks.adalahPemilik) {
        await konteks.balas("Hanya admin grup yang dapat mereset peringatan.");
        return;
      }

      repositoriPeringatan.resetPeringatan(konteks.idObrolan, targetJid);
      await konteks.balas(`Semua catatan peringatan untuk @${nomorTarget} telah direset.`);
      return;
    }

    const daftar = repositoriPeringatan.ambilDaftarPeringatan(konteks.idObrolan, targetJid);

    if (daftar.length === 0) {
      await konteks.balas(`Pengguna @${nomorTarget} belum memiliki catatan peringatan.`);
      return;
    }

    let teks = `*Riwayat Peringatan: @${nomorTarget}*\n`;
    teks += `Total: ${daftar.length}/3\n\n`;

    daftar.forEach((item, index) => {
      const tanggal = new Date(item.dibuatPada).toLocaleDateString("id-ID");
      teks += `${index + 1}. [${tanggal}] ${item.alasan}\n`;
    });

    await konteks.soket.sendMessage(
      konteks.idObrolan,
      {
        text: teks.trim(),
        mentions: [targetJid],
      },
      { quoted: konteks.pesanMentah }
    );
  },
};
