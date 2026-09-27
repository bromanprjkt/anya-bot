import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { repositoriGrup } from "../../repositories/group-repository.js";

export const perintahAntiLink: PerintahBot = {
  nama: "antilink",
  alias: ["antitaun"],
  deskripsi: "Mengaktifkan atau menonaktifkan fitur proteksi tautan terlarang",
  kategori: "moderation",
  hanyaGrup: true,
  membutuhkanAdmin: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const aksi = konteks.argumen[0]?.toLowerCase();

    if (aksi === "on" || aksi === "aktif") {
      repositoriGrup.perbaruiPengaturan(konteks.idObrolan, { antilinkAktif: true });
      await konteks.balas("Fitur Anti-Link berhasil DIAKTIFKAN untuk grup ini.");
      return;
    }

    if (aksi === "off" || aksi === "nonaktif") {
      repositoriGrup.perbaruiPengaturan(konteks.idObrolan, { antilinkAktif: false });
      await konteks.balas("Fitur Anti-Link telah DINONAKTIFKAN.");
      return;
    }

    const aktif = repositoriGrup.apakahAntilinkAktif(konteks.idObrolan);
    await konteks.balas(
      `Status Anti-Link: *${aktif ? "AKTIF" : "NONAKTIF"}*\n` +
      `Gunakan: !antilink on atau !antilink off`
    );
  },
};
