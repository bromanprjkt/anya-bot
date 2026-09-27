import type { KonteksPerintah } from "./message-context.js";
import { buatPencatat } from "../utils/logger.js";

const pencatat = buatPencatat("PenanganKesalahan");

export class KesalahanPengguna extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "KesalahanPengguna";
  }
}

export class KesalahanValidasi extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "KesalahanValidasi";
  }
}

export class KesalahanIzin extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "KesalahanIzin";
  }
}

export class KesalahanLayananEksternal extends Error {
  constructor(pesan: string) {
    super(pesan);
    this.name = "KesalahanLayananEksternal";
  }
}

export class KesalahanBatasWaktu extends Error {
  constructor(pesan: string = "Waktu pemrosesan permintaan telah habis.") {
    super(pesan);
    this.name = "KesalahanBatasWaktu";
  }
}

/**
 * Menangani kesalahan eksekusi perintah secara aman tanpa membocorkan stack trace ke WhatsApp.
 */
export async function tanganiKesalahanPerintah(
  kesalahan: unknown,
  konteks: KonteksPerintah
): Promise<void> {
  const namaPerintah = konteks.namaPerintah;
  const idPengguna = konteks.idPengguna;

  pencatat.error(
    {
      namaPerintah,
      idPengguna,
      idObrolan: konteks.idObrolan,
      kesalahan: kesalahan instanceof Error ? kesalahan.stack : kesalahan,
    },
    `Kesalahan saat mengeksekusi perintah ${namaPerintah}`
  );

  let pesanKePengguna: string;

  if (kesalahan instanceof KesalahanPengguna || kesalahan instanceof KesalahanValidasi) {
    pesanKePengguna = `Format salah: ${kesalahan.message}`;
  } else if (kesalahan instanceof KesalahanIzin) {
    pesanKePengguna = `Akses ditolak: ${kesalahan.message}`;
  } else if (kesalahan instanceof KesalahanLayananEksternal) {
    pesanKePengguna = `Layanan eksternal sedang mengalami gangguan. Silakan coba lagi nanti.`;
  } else if (kesalahan instanceof KesalahanBatasWaktu) {
    pesanKePengguna = `Proses memakan waktu terlalu lama dan dihentikan. Silakan coba beberapa saat lagi.`;
  } else {
    pesanKePengguna = `Terjadi kesalahan saat memproses perintah. Silakan coba beberapa saat lagi.`;
  }

  try {
    await konteks.balas(pesanKePengguna);
  } catch (kesalahanBalas) {
    pencatat.error(
      { kesalahan: kesalahanBalas },
      "Gagal mengirim pesan kesalahan ke WhatsApp"
    );
  }
}
