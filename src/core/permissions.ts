import type { PerintahBot } from "./command-registry.js";
import type { KonteksPerintah } from "./message-context.js";

export interface HasilPemeriksaanIzin {
  diizinkan: boolean;
  alasanPenolakan?: string;
}

/**
 * Memeriksa hak akses pengguna terhadap perintah yang diminta.
 */
export function periksaIzinPerintah(
  perintah: PerintahBot,
  konteks: KonteksPerintah
): HasilPemeriksaanIzin {
  if (perintah.hanyaPemilik && !konteks.adalahPemilik) {
    return {
      diizinkan: false,
      alasanPenolakan: "Perintah ini khusus untuk pemilik bot.",
    };
  }

  if (perintah.hanyaGrup && !konteks.adalahGrup) {
    return {
      diizinkan: false,
      alasanPenolakan: "Perintah ini hanya dapat digunakan di dalam grup WhatsApp.",
    };
  }

  if (perintah.membutuhkanAdmin && !konteks.adalahAdmin) {
    return {
      diizinkan: false,
      alasanPenolakan: "Anda harus menjadi admin grup untuk menggunakan perintah ini.",
    };
  }

  if (perintah.membutuhkanBotAdmin && !konteks.adalahAdminBot) {
    return {
      diizinkan: false,
      alasanPenolakan: "Bot harus dijadikan admin grup terlebih dahulu.",
    };
  }

  return { diizinkan: true };
}
