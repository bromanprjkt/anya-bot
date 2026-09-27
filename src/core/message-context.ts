import {
  type WASocket,
  type WAMessage,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import { buatPencatat } from "../utils/logger.js";

const pencatat = buatPencatat("KonteksPerintah");

export interface PesanKutipan {
  idPesan: string;
  pengirim: string;
  teks: string;
  adalahGambar: boolean;
  adalahVideo: boolean;
  adalahStiker: boolean;
  pesanMentah: any; // Format internal Baileys
}

export interface KonteksPerintah {
  soket: WASocket;
  pesanMentah: WAMessage;
  idObrolan: string;
  idPengguna: string;
  namaPengirim: string;
  adalahGrup: boolean;
  adalahAdmin: boolean;
  adalahAdminBot: boolean;
  adalahPemilik: boolean;
  namaPerintah: string;
  argumen: string[];
  teksArgumen: string;
  pesanKutipan?: PesanKutipan;
  balas: (teks: string) => Promise<void>;
  unduhMedia: () => Promise<Buffer | null>;
}

/**
 * Mengunduh media dari pesan langsung atau pesan kutipan (quoted).
 */
export async function unduhMediaPesan(
  pesan: WAMessage,
  soket: WASocket
): Promise<Buffer | null> {
  const isiPesan = pesan.message;
  if (!isiPesan) return null;

  const memilikiMediaLangsung = Boolean(
    isiPesan.imageMessage ||
    isiPesan.videoMessage ||
    isiPesan.stickerMessage ||
    isiPesan.documentMessage
  );

  try {
    if (memilikiMediaLangsung) {
      const buffer = await downloadMediaMessage(
        pesan,
        "buffer",
        {},
        {
          logger: pencatat as any,
          reuploadRequest: soket.updateMediaMessage,
        }
      );
      return buffer as Buffer;
    }

    const pesanKutipan = isiPesan.extendedTextMessage?.contextInfo?.quotedMessage;
    if (pesanKutipan) {
      const memilikiMediaKutipan = Boolean(
        pesanKutipan.imageMessage ||
        pesanKutipan.videoMessage ||
        pesanKutipan.stickerMessage ||
        pesanKutipan.documentMessage
      );

      if (memilikiMediaKutipan) {
        const pesanTiruan: WAMessage = {
          key: {
            remoteJid: pesan.key.remoteJid,
            id: isiPesan.extendedTextMessage?.contextInfo?.stanzaId,
            participant: isiPesan.extendedTextMessage?.contextInfo?.participant,
          },
          message: pesanKutipan,
        };

        const buffer = await downloadMediaMessage(
          pesanTiruan,
          "buffer",
          {},
          {
            logger: pencatat as any,
            reuploadRequest: soket.updateMediaMessage,
          }
        );
        return buffer as Buffer;
      }
    }
  } catch (kesalahan) {
    pencatat.error({ kesalahan }, "Gagal mengunduh buffer media dari pesan");
  }

  return null;
}
