import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { repositoriGrup } from "../../repositories/group-repository.js";

export const perintahAntiSpam: PerintahBot = {
  nama: "antispam",
  alias: ["spamprot"],
  deskripsi: "Mengaktifkan atau menonaktifkan deteksi spam berbasis frekuensi",
  kategori: "moderation",
  hanyaGrup: true,
  membutuhkanAdmin: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const aksi = konteks.argumen[0]?.toLowerCase();

    if (aksi === "on" || aksi === "aktif") {
      repositoriGrup.perbaruiPengaturan(konteks.idObrolan, { antispamAktif: true });
      await konteks.balas("Fitur Anti-Spam berhasil DIAKTIFKAN untuk grup ini.");
      return;
    }

    if (aksi === "off" || aksi === "nonaktif") {
      repositoriGrup.perbaruiPengaturan(konteks.idObrolan, { antispamAktif: false });
      await konteks.balas("Fitur Anti-Spam telah DINONAKTIFKAN.");
      return;
    }

    const aktif = repositoriGrup.apakahAntispamAktif(konteks.idObrolan);
    await konteks.balas(
      `Status Anti-Spam: *${aktif ? "AKTIF" : "NONAKTIF"}*\n` +
      `Gunakan: !antispam on atau !antispam off`
    );
  },
};
