import type { WASocket, WAMessage, GroupMetadata } from "@whiskeysockets/baileys";
import type { RegistriPerintah } from "./command-registry.js";
import { KonteksPerintah, unduhMediaPesan } from "./message-context.js";
import { periksaIzinPerintah } from "./permissions.js";
import { tanganiKesalahanPerintah } from "./error-handler.js";
import { buatPencatat } from "../utils/logger.js";
import type { KonfigurasiEnv } from "../config/env.js";

const pencatat = buatPencatat("PerutePerintah");

export class PerutePerintah {
  constructor(
    private readonly registri: RegistriPerintah,
    private readonly konfigurasi: KonfigurasiEnv
  ) {}

  /**
   * Mengekstrak konten teks dari berbagai jenis pesan Baileys.
   */
  public ekstrakTeksPesan(pesan: WAMessage): string {
    const isi = pesan.message;
    if (!isi) return "";

    return (
      isi.conversation ??
      isi.extendedTextMessage?.text ??
      isi.imageMessage?.caption ??
      isi.videoMessage?.caption ??
      isi.documentMessage?.caption ??
      ""
    ).trim();
  }

  /**
   * Memproses pesan masuk dari WhatsApp dan mengarahkan ke perintah yang sesuai.
   */
  public async prosesPesan(soket: WASocket, pesan: WAMessage): Promise<void> {
    const teks = this.ekstrakTeksPesan(pesan);
    if (!teks) return;

    const awalan = this.konfigurasi.awalanPerintah;
    if (!teks.startsWith(awalan)) return;

    const tanpaAwalan = teks.slice(awalan.length).trim();
    if (!tanpaAwalan) return;

    const bagian = tanpaAwalan.split(/\s+/);
    const namaPerintah = (bagian[0] ?? "").toLowerCase();
    const argumen = bagian.slice(1);
    const teksArgumen = argumen.join(" ");

    const perintah = this.registri.cariPerintah(namaPerintah);
    if (!perintah) return;

    const idObrolan = pesan.key.remoteJid ?? "";
    const adalahGrup = idObrolan.endsWith("@g.us");
    const idPengirim = adalahGrup
      ? (pesan.key.participant ?? pesan.participant ?? "")
      : idObrolan;
    const namaPengirim = pesan.pushName ?? "Pengguna";

    let adalahAdmin = false;
    let adalahAdminBot = false;

    if (adalahGrup) {
      try {
        const metadata: GroupMetadata = await soket.groupMetadata(idObrolan);
        const botJid = soket.user?.id ? soket.user.id.split(":")[0] + "@s.whatsapp.net" : "";

        for (const peserta of metadata.participants) {
          const pesertaJid = peserta.id.split(":")[0] + "@s.whatsapp.net";
          const pengirimJidNormal = idPengirim.split(":")[0] + "@s.whatsapp.net";

          const apakahDiaAdmin = peserta.admin === "admin" || peserta.admin === "superadmin";

          if (pesertaJid === pengirimJidNormal && apakahDiaAdmin) {
            adalahAdmin = true;
          }

          if (pesertaJid === botJid && apakahDiaAdmin) {
            adalahAdminBot = true;
          }
        }
      } catch (kesalahan) {
        pencatat.warn({ kesalahan, idObrolan }, "Gagal mengambil metadata grup");
      }
    }

    const nomorPemilikNormal = this.konfigurasi.idPemilikBot
      ? this.konfigurasi.idPemilikBot.replace(/[^0-9]/g, "")
      : "";
    const nomorPengirim = idPengirim.replace(/[^0-9]/g, "");
    const adalahPemilik = Boolean(
      nomorPemilikNormal && nomorPengirim.startsWith(nomorPemilikNormal)
    );

    const balas = async (isiBalasan: string): Promise<void> => {
      await soket.sendMessage(idObrolan, { text: isiBalasan }, { quoted: pesan });
    };

    const unduhMedia = async (): Promise<Buffer | null> => {
      return unduhMediaPesan(pesan, soket);
    };

    const konteks: KonteksPerintah = {
      soket,
      pesanMentah: pesan,
      idObrolan,
      idPengguna: idPengirim,
      namaPengirim,
      adalahGrup,
      adalahAdmin,
      adalahAdminBot,
      adalahPemilik,
      namaPerintah,
      argumen,
      teksArgumen,
      balas,
      unduhMedia,
    };

    const hasilIzin = periksaIzinPerintah(perintah, konteks);
    if (!hasilIzin.diizinkan) {
      await balas(hasilIzin.alasanPenolakan ?? "Anda tidak memiliki izin.");
      return;
    }

    pencatat.info(
      {
        namaPerintah,
        pengirim: idPengirim,
        obrolan: idObrolan,
        adalahGrup,
      },
      `Menjalankan perintah !${namaPerintah}`
    );

    try {
      await perintah.jalankan(konteks);
    } catch (kesalahan) {
      await tanganiKesalahanPerintah(kesalahan, konteks);
    }
  }
}
