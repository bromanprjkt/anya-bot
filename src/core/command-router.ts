import type { WASocket, WAMessage, GroupMetadata } from "@whiskeysockets/baileys";
import type { RegistriPerintah } from "./command-registry.js";
import { KonteksPerintah, unduhMediaPesan } from "./message-context.js";
import { periksaIzinPerintah } from "./permissions.js";
import { tanganiKesalahanPerintah } from "./error-handler.js";
import { buatPencatat } from "../utils/logger.js";
import type { KonfigurasiEnv } from "../config/env.js";
import { pembatasFrekuensi } from "./rate-limiter.js";
import { layananAi } from "../services/ai/ai-service.js";

const pencatat = buatPencatat("PerutePerintah");

export class PerutePerintah {
  constructor(
    private readonly registri: RegistriPerintah,
    private readonly konfigurasi: KonfigurasiEnv
  ) {}

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

  public async prosesPesan(soket: WASocket, pesan: WAMessage): Promise<void> {
    const teks = this.ekstrakTeksPesan(pesan);
    if (!teks) return;

    const idObrolan = pesan.key.remoteJid ?? "";
    const adalahGrup = idObrolan.endsWith("@g.us");
    const idPengirim = adalahGrup
      ? (pesan.key.participant ?? pesan.participant ?? "")
      : idObrolan;
    const namaPengirim = pesan.pushName ?? "Pengguna";

    const awalan = this.konfigurasi.awalanPerintah;

    if (!teks.startsWith(awalan)) {
      if (!this.konfigurasi.aiAktif) return;

      const botJid = soket.user?.id ? soket.user.id.split(":")[0] + "@s.whatsapp.net" : "";
      const infoKonteks = pesan.message?.extendedTextMessage?.contextInfo;
      const disebutDalamPesan = Boolean(botJid && infoKonteks?.mentionedJid?.includes(botJid));
      const membalasPesanBot = Boolean(
        botJid &&
        infoKonteks?.participant &&
        infoKonteks.participant.split(":")[0] + "@s.whatsapp.net" === botJid
      );
      const diawaliKataAnya = /^anya\b[\s,.:!?]*/i.test(teks);

      const pemicuAi = adalahGrup
        ? diawaliKataAnya || disebutDalamPesan || membalasPesanBot
        : diawaliKataAnya || true;

      if (!pemicuAi) return;

      let prompt = teks;
      if (diawaliKataAnya) {
        prompt = teks.replace(/^anya\b[\s,.:!?]*/i, "").trim();
      }
      if (!prompt) {
        prompt = "Halo Anya";
      }

      const batas = pembatasFrekuensi.periksaBatas(idPengirim, 5, 10000);
      if (!batas.diizinkan) return;

      try {
        if (typeof soket.sendPresenceUpdate === "function") {
          await soket.sendPresenceUpdate("composing", idObrolan).catch(() => {});
        }
        const balasanAi = await layananAi.tanyaAi(idObrolan, prompt, namaPengirim);
        await soket.sendMessage(idObrolan, { text: balasanAi }, { quoted: pesan });
      } catch (kesalahan) {
        pencatat.error({ kesalahan, idObrolan }, "Gagal memproses percakapan santai AI");
      }
      return;
    }

    const tanpaAwalan = teks.slice(awalan.length).trim();
    if (!tanpaAwalan) return;

    const bagian = tanpaAwalan.split(/\s+/);
    const namaPerintah = (bagian[0] ?? "").toLowerCase();
    const argumen = bagian.slice(1);
    const teksArgumen = argumen.join(" ");

    const perintah = this.registri.cariPerintah(namaPerintah);
    if (!perintah) return;

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
