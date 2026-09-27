import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { repositoriGrup } from "../../repositories/group-repository.js";

export const perintahGoodbye: PerintahBot = {
  nama: "goodbye",
  alias: ["perpisahan"],
  deskripsi: "Mengaktifkan atau menonaktifkan pesan perpisahan saat member keluar",
  kategori: "group",
  hanyaGrup: true,
  membutuhkanAdmin: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const opsi = konteks.argumen[0]?.toLowerCase();

    if (opsi === "on" || opsi === "aktif") {
      repositoriGrup.perbaruiPengaturan(konteks.idObrolan, { goodbyeAktif: true });
      await konteks.balas("Pesan perpisahan (goodbye) berhasil DIAKTIFKAN untuk grup ini.");
      return;
    }

    if (opsi === "off" || opsi === "nonaktif") {
      repositoriGrup.perbaruiPengaturan(konteks.idObrolan, { goodbyeAktif: false });
      await konteks.balas("Pesan perpisahan (goodbye) telah DINONAKTIFKAN.");
      return;
    }

    const statusAktif = repositoriGrup.apakahGoodbyeAktif(konteks.idObrolan);
    await konteks.balas(
      `Status pesan perpisahan: *${statusAktif ? "AKTIF" : "NONAKTIF"}*\n` +
      `Gunakan: !goodbye on atau !goodbye off`
    );
  },
};
