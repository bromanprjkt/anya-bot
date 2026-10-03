import type { WASocket, WAMessage, GroupMetadata } from "@whiskeysockets/baileys";
import type { RegistriPerintah } from "./command-registry.js";
import { KonteksPerintah, unduhMediaPesan } from "./message-context.js";
import { periksaIzinPerintah } from "./permissions.js";
import { tanganiKesalahanPerintah } from "./error-handler.js";
import { buatPencatat } from "../utils/logger.js";
import type { KonfigurasiEnv } from "../config/env.js";
import { pembatasFrekuensi } from "./rate-limiter.js";
import { layananAi } from "../services/ai/ai-service.js";
import { bacaDokumenLampiran } from "../services/ai/tools/document-reader.js";
import { transkripsikanPesanSuara } from "../services/ai/tools/audio-transcriber.js";

const pencatat = buatPencatat("PerutePerintah");

function ekstrakMentions(teks: string, pengirimTambahan?: string): string[] {
  const himpunanJid = new Set<string>();
  const cocok = teks.matchAll(/@(\d{5,16})/g);
  for (const c of cocok) {
    if (c[1]) {
      himpunanJid.add(`${c[1]}@s.whatsapp.net`);
    }
  }
  if (pengirimTambahan && pengirimTambahan.includes("@s.whatsapp.net")) {
    const nomor = pengirimTambahan.split("@")[0]?.split(":")[0];
    if (nomor && teks.includes(`@${nomor}`)) {
      himpunanJid.add(`${nomor}@s.whatsapp.net`);
    }
  }
  return Array.from(himpunanJid);
}

export class PerutePerintah {
  constructor(
    private readonly registri: RegistriPerintah,
    private readonly konfigurasi: KonfigurasiEnv
  ) {}

  public ekstrakTeksPesan(pesan: WAMessage): string {
    const isiMentah = pesan.message;
    if (!isiMentah) return "";

    const isi =
      isiMentah.viewOnceMessage?.message ||
      isiMentah.viewOnceMessageV2?.message ||
      isiMentah.documentWithCaptionMessage?.message ||
      isiMentah;

    const responInteraktif =
      isi.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    if (responInteraktif) {
      try {
        const data = JSON.parse(responInteraktif);
        if (data.id) return String(data.id).trim();
      } catch {}
    }

    if (isi.templateButtonReplyMessage?.selectedId) {
      return isi.templateButtonReplyMessage.selectedId.trim();
    }

    if (isi.buttonsResponseMessage?.selectedButtonId) {
      return isi.buttonsResponseMessage.selectedButtonId.trim();
    }

    if (isi.listResponseMessage?.singleSelectReply?.selectedRowId) {
      return isi.listResponseMessage.singleSelectReply.selectedRowId.trim();
    }

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
    const isiPesan = pesan.message;
    if (!isiPesan) return;

    let teks = this.ekstrakTeksPesan(pesan);
    const idObrolan = pesan.key.remoteJid ?? "";
    const adalahGrup = idObrolan.endsWith("@g.us");
    const idPengirim = adalahGrup
      ? (pesan.key.participant ?? pesan.participant ?? "")
      : idObrolan;
    const namaPengirim = pesan.pushName ?? "Pengguna";
    const nomorPemilikNormal = this.konfigurasi.idPemilikBot
      ? this.konfigurasi.idPemilikBot.replace(/[^0-9]/g, "")
      : "";
    const nomorPengirim = idPengirim.replace(/[^0-9]/g, "");
    const adalahPemilik = Boolean(
      nomorPemilikNormal && nomorPengirim.startsWith(nomorPemilikNormal)
    );

    const awalan = this.konfigurasi.awalanPerintah;

    if (!teks.startsWith(awalan)) {
      if (!this.konfigurasi.aiAktif) return;

      const botJid = soket.user?.id ? soket.user.id.split(":")[0] + "@s.whatsapp.net" : "";
      const infoKonteks = isiPesan.extendedTextMessage?.contextInfo;
      const disebutDalamPesan = Boolean(botJid && infoKonteks?.mentionedJid?.includes(botJid));
      const membalasPesanBot = Boolean(
        botJid &&
        infoKonteks?.participant &&
        infoKonteks.participant.split(":")[0] + "@s.whatsapp.net" === botJid
      );
      const diawaliKataAnya = /^anya\b[\s,.:!?]*/i.test(teks);

      const pesanKutipan = infoKonteks?.quotedMessage;
      const adaAudio = Boolean(isiPesan.audioMessage || pesanKutipan?.audioMessage);
      const adaGambar = Boolean(isiPesan.imageMessage || pesanKutipan?.imageMessage);
      const adaDokumen = Boolean(isiPesan.documentMessage || pesanKutipan?.documentMessage);

      const pemicuAi = adalahGrup
        ? diawaliKataAnya || disebutDalamPesan || membalasPesanBot
        : diawaliKataAnya || adaAudio || adaGambar || adaDokumen || true;

      if (!pemicuAi) return;

      const batas = pembatasFrekuensi.periksaBatas(idPengirim, 5, 10000);
      if (!batas.diizinkan) return;

      let prompt = teks;
      if (diawaliKataAnya) {
        prompt = teks.replace(/^anya\b[\s,.:!?]*/i, "").trim();
      }

      let gambarBase64: string[] | undefined;

      if (adaAudio) {
        try {
          if (typeof soket.sendPresenceUpdate === "function") {
            await soket.sendPresenceUpdate("recording", idObrolan).catch(() => {});
          }
          const bufferAudio = await unduhMediaPesan(pesan, soket);
          if (bufferAudio) {
            const transkripsi = await transkripsikanPesanSuara(bufferAudio);
            if (transkripsi) {
              prompt = transkripsi;
            }
          }
        } catch (err) {
          pencatat.warn({ err }, "Gagal mentranskripsi pesan suara pengguna");
        }
      }

      if (adaGambar) {
        try {
          const bufferMedia = await unduhMediaPesan(pesan, soket);
          if (bufferMedia) {
            const mime =
              isiPesan.imageMessage?.mimetype ||
              pesanKutipan?.imageMessage?.mimetype ||
              "image/jpeg";
            gambarBase64 = [`data:${mime};base64,${bufferMedia.toString("base64")}`];
            if (!prompt) {
              prompt = "Jelaskan atau baca apa yang ada di dalam gambar ini";
            }
          }
        } catch (err) {
          pencatat.warn({ err }, "Gagal mengunduh gambar untuk analisis AI");
        }
      } else if (adaDokumen) {
        try {
          const bufferMedia = await unduhMediaPesan(pesan, soket);
          if (bufferMedia) {
            const namaBerkas =
              isiPesan.documentMessage?.fileName ||
              pesanKutipan?.documentMessage?.fileName ||
              "dokumen";
            const mime =
              isiPesan.documentMessage?.mimetype ||
              pesanKutipan?.documentMessage?.mimetype ||
              "";
            const teksDokumen = await bacaDokumenLampiran(bufferMedia, namaBerkas, mime);
            if (teksDokumen) {
              prompt = `[Isi Dokumen "${namaBerkas}"]:\n${teksDokumen}\n\n${prompt || "Tolong baca dan analisis isi berkas dokumen di atas."}`;
            }
          }
        } catch (err) {
          pencatat.warn({ err }, "Gagal membaca berkas dokumen untuk AI");
        }
      }

      if (!prompt) {
        prompt = "Halo Anya";
      }

      try {
        if (typeof soket.sendPresenceUpdate === "function") {
          await soket.sendPresenceUpdate("composing", idObrolan).catch(() => {});
        }
        const balasanAi = await layananAi.tanyaAi(
          idObrolan,
          prompt,
          namaPengirim,
          {
            adalahGrup,
            idPengguna: idPengirim,
            gambarBase64,
            adalahPemilik,
            prioritas: 3,
            soket,
          }
        );
        const daftarMention = ekstrakMentions(balasanAi, idPengirim);
        await soket.sendMessage(
          idObrolan,
          {
            text: balasanAi,
            mentions: daftarMention.length > 0 ? daftarMention : undefined,
          },
          { quoted: pesan }
        );
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

    const balas = async (isiBalasan: string): Promise<void> => {
      const daftarMention = ekstrakMentions(isiBalasan, idPengirim);
      await soket.sendMessage(
        idObrolan,
        {
          text: isiBalasan,
          mentions: daftarMention.length > 0 ? daftarMention : undefined,
        },
        { quoted: pesan }
      );
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
