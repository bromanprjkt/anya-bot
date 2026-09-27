import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { repositoriGrup } from "../../repositories/group-repository.js";

export const perintahWelcome: PerintahBot = {
  nama: "welcome",
  alias: ["sambutan"],
  deskripsi: "Mengaktifkan atau menonaktifkan pesan sambutan member baru",
  kategori: "group",
  hanyaGrup: true,
  membutuhkanAdmin: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const opsi = konteks.argumen[0]?.toLowerCase();

    if (opsi === "on" || opsi === "aktif") {
      repositoriGrup.perbaruiPengaturan(konteks.idObrolan, { welcomeAktif: true });
      await konteks.balas("Pesan sambutan (welcome) berhasil DIAKTIFKAN untuk grup ini.");
      return;
    }

    if (opsi === "off" || opsi === "nonaktif") {
      repositoriGrup.perbaruiPengaturan(konteks.idObrolan, { welcomeAktif: false });
      await konteks.balas("Pesan sambutan (welcome) telah DINONAKTIFKAN.");
      return;
    }

    const statusAktif = repositoriGrup.apakahWelcomeAktif(konteks.idObrolan);
    await konteks.balas(
      `Status pesan sambutan: *${statusAktif ? "AKTIF" : "NONAKTIF"}*\n` +
      `Gunakan: !welcome on atau !welcome off`
    );
  },
};
