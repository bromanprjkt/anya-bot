import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";

let statusPemeliharaan: boolean = false;

export function apakahModePemeliharaan(): boolean {
  return statusPemeliharaan;
}

export const perintahMaintenance: PerintahBot = {
  nama: "maintenance",
  alias: ["pemeliharaan", "mt"],
  deskripsi: "Mengaktifkan atau menonaktifkan mode pemeliharaan bot",
  kategori: "admin",
  hanyaPemilik: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const aksi = konteks.argumen[0]?.toLowerCase();

    if (aksi === "on" || aksi === "aktif") {
      statusPemeliharaan = true;
      await konteks.balas("Mode pemeliharaan berhasil DIATIFKAN. Perintah publik dibatasi.");
      return;
    }

    if (aksi === "off" || aksi === "nonaktif") {
      statusPemeliharaan = false;
      await konteks.balas("Mode pemeliharaan telah DINONAKTIFKAN. Bot beroperasi normal.");
      return;
    }

    await konteks.balas(
      `Status pemeliharaan saat ini: *${statusPemeliharaan ? "AKTIF" : "NONAKTIF"}*\n\n` +
      `Gunakan: !maintenance on / !maintenance off`
    );
  },
};
