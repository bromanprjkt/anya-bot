import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { konfigurasiEnv } from "../../config/env.js";

let statusBacaOtomatis: boolean = konfigurasiEnv.bacaPesanOtomatis;

/**
 * Memeriksa apakah fitur auto read (baca pesan otomatis) sedang aktif.
 */
export function apakahBacaOtomatisAktif(): boolean {
  return statusBacaOtomatis;
}

/**
 * Mengubah status aktif fitur auto read.
 */
export function aturStatusBacaOtomatis(status: boolean): void {
  statusBacaOtomatis = status;
}

/**
 * Perintah admin untuk mengaktifkan atau menonaktifkan fitur baca pesan otomatis.
 */
export const perintahAutoRead: PerintahBot = {
  nama: "autoread",
  alias: ["bacaotomatis", "read"],
  deskripsi: "Mengaktifkan atau menonaktifkan fitur baca pesan otomatis (centang biru)",
  kategori: "admin",
  hanyaPemilik: true,
  jalankan: async (konteks: KonteksPerintah) => {
    const aksi = konteks.argumen[0]?.toLowerCase();

    if (aksi === "on" || aksi === "aktif" || aksi === "1") {
      statusBacaOtomatis = true;
      await konteks.balas("Fitur Auto Read (centang biru otomatis) berhasil *DIAKTIFKAN*.");
      return;
    }

    if (aksi === "off" || aksi === "nonaktif" || aksi === "0") {
      statusBacaOtomatis = false;
      await konteks.balas("Fitur Auto Read (centang biru otomatis) telah *DINONAKTIFKAN*.");
      return;
    }

    await konteks.balas(
      `Status Auto Read saat ini: *${statusBacaOtomatis ? "AKTIF" : "NONAKTIF"}*\n\n` +
      `Gunakan: \`!autoread on\` atau \`!autoread off\``
    );
  },
};
