import type {
  BaileysEventEmitter,
  WASocket,
  WAMessage,
  ParticipantAction,
} from "@whiskeysockets/baileys";
import { buatPencatat } from "../utils/logger.js";
import { tanganiPembaruanKoneksi } from "./connection.js";

const pencatat = buatPencatat("AcaraWhatsApp");

export interface PendengarAcaraPesan {
  tanganiPesanMasuk: (soket: WASocket, pesan: WAMessage) => Promise<void>;
}

export interface PendengarAcaraGrup {
  tanganiPembaruanPeserta?: (
    soket: WASocket,
    idGrup: string,
    peserta: string[],
    tindakan: ParticipantAction
  ) => Promise<void>;
}

export function daftarkanAcaraWhatsApp(
  soket: WASocket,
  penghematKredensial: () => Promise<void>,
  padaKoneksiTerputus: () => void,
  pendengarPesan?: PendengarAcaraPesan,
  pendengarGrup?: PendengarAcaraGrup,
  padaSesiKeluar?: () => Promise<void>
): void {
  const penyalur: BaileysEventEmitter = soket.ev;

  penyalur.on("creds.update", () => {
    void penghematKredensial().catch((kesalahan) => {
      pencatat.error({ kesalahan }, "Gagal menyimpan kredensial sesi");
    });
  });

  penyalur.on("connection.update", (pembaruan) => {
    const hasil = tanganiPembaruanKoneksi(pembaruan);
    if (hasil.harusMenghubungkanUlang) {
      padaKoneksiTerputus();
    } else if (hasil.alasanPenutupan === 401 && padaSesiKeluar) {
      void padaSesiKeluar().catch(() => {});
    }
  });

  penyalur.on("messages.upsert", (data) => {
    if (data.type !== "notify") return;

    for (const pesan of data.messages) {
      if (!pesan.message || pesan.key.fromMe) continue;

      if (pendengarPesan) {
        pendengarPesan.tanganiPesanMasuk(soket, pesan).catch((kesalahan) => {
          pencatat.error({ kesalahan }, "Gagal memproses pesan masuk");
        });
      }
    }
  });

  penyalur.on("group-participants.update", (data) => {
    if (pendengarGrup?.tanganiPembaruanPeserta) {
      const daftarPeserta = data.participants.map((peserta) =>
        typeof peserta === "string" ? peserta : (peserta as { id: string }).id
      );

      pendengarGrup
        .tanganiPembaruanPeserta(soket, data.id, daftarPeserta, data.action)
        .catch((kesalahan) => {
          pencatat.error(
            { kesalahan, idGrup: data.id, tindakan: data.action },
            "Gagal memproses pembaruan peserta grup"
          );
        });
    }
  });
}
