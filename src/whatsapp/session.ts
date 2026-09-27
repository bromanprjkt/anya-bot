import fs from "node:fs/promises";
import path from "node:path";
import { useMultiFileAuthState, type AuthenticationState } from "@whiskeysockets/baileys";
import { buatPencatat } from "../utils/logger.js";

const pencatat = buatPencatat("ManajerSesi");

export interface HasilManajerSesi {
  statusAutentikasi: AuthenticationState;
  simpanKredensial: () => Promise<void>;
  bersihkanSesi: () => Promise<void>;
  jalurSesi: string;
}

/**
 * Menginisialisasi penyimpanan sesi multi-file untuk Baileys.
 *
 * @param direktoriSesi Direktori penyimpanan kredensial sesi
 */
export async function inisialisasiSesiWhatsApp(
  direktoriSesi: string
): Promise<HasilManajerSesi> {
  const jalurLengkap = path.resolve(direktoriSesi);

  pencatat.debug({ jalur: jalurLengkap }, "Menginisialisasi sesi WhatsApp");

  const { state, saveCreds } = await useMultiFileAuthState(jalurLengkap);

  const bersihkanSesi = async (): Promise<void> => {
    pencatat.warn({ jalur: jalurLengkap }, "Menghapus kredensial sesi WhatsApp...");
    try {
      await fs.rm(jalurLengkap, { recursive: true, force: true });
      pencatat.info("Kredensial sesi WhatsApp berhasil dihapus");
    } catch (kesalahan) {
      pencatat.error(
        { kesalahan, jalur: jalurLengkap },
        "Gagal menghapus direktori sesi WhatsApp"
      );
      throw kesalahan;
    }
  };

  return {
    statusAutentikasi: state,
    simpanKredensial: saveCreds,
    bersihkanSesi,
    jalurSesi: jalurLengkap,
  };
}
