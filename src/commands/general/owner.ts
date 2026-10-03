import type { PerintahBot } from "../../core/command-registry.js";
import type { KonteksPerintah } from "../../core/message-context.js";
import { konfigurasiEnv } from "../../config/env.js";

export const perintahOwner: PerintahBot = {
  nama: "owner",
  alias: ["pemilik", "creator"],
  deskripsi: "Menampilkan kontak pemilik bot",
  kategori: "general",
  jalankan: async (konteks: KonteksPerintah) => {
    const idPemilik = konfigurasiEnv.idPemilikBot;
    const nomorBersih = idPemilik ? idPemilik.replace(/[^0-9]/g, "") : "";

    const kartuKontak =
      "BEGIN:VCARD\n" +
      "VERSION:3.0\n" +
      "FN:bromanprjkt\n" +
      "ORG:mau jadi bos;\n" +
      "TITLE:mau jadi bos\n" +
      (nomorBersih
        ? `TEL;type=CELL;type=VOICE;waid=${nomorBersih}:+${nomorBersih}\n`
        : "") +
      "END:VCARD";

    await konteks.soket.sendMessage(
      konteks.idObrolan,
      {
        contacts: {
          displayName: "bromanprjkt",
          contacts: [{ vcard: kartuKontak }],
        },
      },
      { quoted: konteks.pesanMentah }
    );
  },
};
