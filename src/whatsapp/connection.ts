import { DisconnectReason, type ConnectionState } from "@whiskeysockets/baileys";
import { isBoom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { buatPencatat } from "../utils/logger.js";

const pencatat = buatPencatat("KoneksiWhatsApp");

export type StatusKoneksi = "terputus" | "menghubungkan" | "terhubung";

export interface HasilPenangananKoneksi {
  harusMenghubungkanUlang: boolean;
  alasanPenutupan?: number;
  pesanKesalahan?: string;
}

export function tanganiPembaruanKoneksi(
  pembaruan: Partial<ConnectionState>
): HasilPenangananKoneksi {
  const { connection, lastDisconnect, qr } = pembaruan;

  if (qr) {
    pencatat.info("QR Code diterima. Silakan pindai melalui WhatsApp:");
    qrcode.generate(qr, { small: true });
  }

  if (connection === "open") {
    pencatat.info("Koneksi WhatsApp berhasil tersambung (open)");
    return { harusMenghubungkanUlang: false };
  }

  if (connection === "close") {
    const kesalahan = lastDisconnect?.error;
    let kodeStatus: number | undefined;

    if (isBoom(kesalahan)) {
      kodeStatus = kesalahan.output.statusCode;
    }

    const pesan = kesalahan instanceof Error ? kesalahan.message : String(kesalahan);
    // Logout sejati hanya terjadi jika status loggedOut dan pesan spesifik mengindikasikan logout perangkat
    const adalahLogout =
      kodeStatus === DisconnectReason.loggedOut &&
      pesan.toLowerCase().includes("logged out");

    pencatat.warn(
      { kodeStatus, pesan, adalahLogout },
      "Koneksi WhatsApp terputus"
    );

    if (adalahLogout) {
      pencatat.error("Perangkat keluar (logged out). Hapus sesi sebelum memindai ulang.");
      return {
        harusMenghubungkanUlang: false,
        alasanPenutupan: kodeStatus,
        pesanKesalahan: pesan,
      };
    }

    return {
      harusMenghubungkanUlang: true,
      alasanPenutupan: kodeStatus,
      pesanKesalahan: pesan,
    };
  }

  return { harusMenghubungkanUlang: false };
}
