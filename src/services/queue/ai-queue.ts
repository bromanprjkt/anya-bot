import type { WASocket } from "@whiskeysockets/baileys";
import { buatPencatat } from "../../utils/logger.js";
import { konfigurasiEnv } from "../../config/env.js";

const pencatat = buatPencatat("AntreanAi");

export type TingkatPrioritasAi = 1 | 2 | 3;

export interface OpsiTugasAi {
  idObrolan: string;
  idPengguna: string;
  namaPekerjaan?: string;
  prioritas?: TingkatPrioritasAi;
  adalahPemilik?: boolean;
  soket?: WASocket;
  bisaDiCache?: boolean;
  kunciCache?: string;
}

interface ItemTugasAi<T> {
  id: string;
  idObrolan: string;
  idPengguna: string;
  prioritas: TingkatPrioritasAi;
  namaPekerjaan: string;
  eksekusi: () => Promise<T>;
  selesai: (hasil: T) => void;
  gagal: (alasan: unknown) => void;
  waktuMasuk: number;
  soket?: WASocket;
  penjagaPresence?: NodeJS.Timeout;
}

interface EntriCacheAi {
  jawaban: string;
  kedaluwarsa: number;
}

export class AntreanAi {
  private readonly antrean: ItemTugasAi<any>[] = [];
  private readonly tugasAktifPerPengguna = new Map<string, number>();
  private readonly permintaanBerjalan = new Map<string, Promise<any>>();
  private readonly cacheJawaban = new Map<string, EntriCacheAi>();
  private jumlahSedangBerjalan = 0;
  private readonly batasKonkurensi: number;
  private readonly kapasitasAntrean: number;
  private readonly batasPerPengguna: number;
  private readonly batasWaktuTungguMs: number;
  private readonly kapasitasMaksCache = 500;
  private readonly ttlCacheMs = 300000;

  constructor() {
    this.batasKonkurensi = konfigurasiEnv.aiBatasKonkurensi;
    this.kapasitasAntrean = konfigurasiEnv.aiBatasAntrean;
    this.batasPerPengguna = konfigurasiEnv.aiBatasPerPengguna;
    this.batasWaktuTungguMs = konfigurasiEnv.aiBatasWaktuAntreanMs;
  }

  public antrekan<T>(
    eksekusi: () => Promise<T>,
    opsi: OpsiTugasAi
  ): Promise<T> {
    const idPenggunaBersih = (opsi.idPengguna.split("@")[0]?.split(":")[0] || opsi.idPengguna).trim();
    const kunciPenyatuan = opsi.kunciCache ? `${idPenggunaBersih}:${opsi.kunciCache}` : "";

    if (kunciPenyatuan && this.permintaanBerjalan.has(kunciPenyatuan)) {
      pencatat.debug({ kunci: kunciPenyatuan }, "Menggabungkan permintaan AI yang identik sedang berjalan");
      return this.permintaanBerjalan.get(kunciPenyatuan) as Promise<T>;
    }

    if (opsi.bisaDiCache && opsi.kunciCache) {
      const entri = this.cacheJawaban.get(opsi.kunciCache);
      if (entri && Date.now() < entri.kedaluwarsa) {
        pencatat.debug({ kunci: opsi.kunciCache }, "Menyajikan jawaban AI dari cache memori");
        return Promise.resolve(entri.jawaban as unknown as T);
      }
    }

    if (this.antrean.length >= this.kapasitasAntrean && !opsi.adalahPemilik) {
      pencatat.warn(
        { sisaAntrean: this.antrean.length, kapasitas: this.kapasitasAntrean },
        "Kapasitas antrean AI penuh, menolak permintaan baru"
      );
      return Promise.reject(
        new Error("Antrean AI Anya sedang penuh padat. Mohon tunggu beberapa saat ya Kak!")
      );
    }

    const janji = new Promise<T>((selesai, gagal) => {
      const prioritas: TingkatPrioritasAi = opsi.adalahPemilik ? 1 : (opsi.prioritas ?? 3);
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nama = opsi.namaPekerjaan || `tanya_ai_${idPenggunaBersih}`;

      let penjagaPresence: NodeJS.Timeout | undefined;
      if (opsi.soket && opsi.idObrolan && typeof opsi.soket.sendPresenceUpdate === "function") {
        const soketRef = opsi.soket;
        const obrolanRef = opsi.idObrolan;
        penjagaPresence = setInterval(() => {
          soketRef.sendPresenceUpdate("composing", obrolanRef).catch(() => {});
        }, 4000);
      }

      const item: ItemTugasAi<T> = {
        id,
        idObrolan: opsi.idObrolan,
        idPengguna: idPenggunaBersih,
        prioritas,
        namaPekerjaan: nama,
        eksekusi,
        selesai: (hasil) => {
          if (penjagaPresence) clearInterval(penjagaPresence);
          if (opsi.bisaDiCache && opsi.kunciCache && typeof hasil === "string" && hasil.length > 5) {
            this.simpanCache(opsi.kunciCache, hasil);
          }
          selesai(hasil);
        },
        gagal: (alasan) => {
          if (penjagaPresence) clearInterval(penjagaPresence);
          gagal(alasan);
        },
        waktuMasuk: Date.now(),
        soket: opsi.soket,
        penjagaPresence,
      };

      if (prioritas === 1) {
        const indeksBukanOwner = this.antrean.findIndex((t) => t.prioritas > 1);
        if (indeksBukanOwner === -1) {
          this.antrean.push(item);
        } else {
          this.antrean.splice(indeksBukanOwner, 0, item);
        }
      } else if (prioritas === 2) {
        const indeksSantai = this.antrean.findIndex((t) => t.prioritas === 3);
        if (indeksSantai === -1) {
          this.antrean.push(item);
        } else {
          this.antrean.splice(indeksSantai, 0, item);
        }
      } else {
        this.antrean.push(item);
      }

      pencatat.debug(
        {
          id,
          idPengguna: idPenggunaBersih,
          prioritas,
          sedangBerjalan: this.jumlahSedangBerjalan,
          sisaAntrean: this.antrean.length,
        },
        "Tugas AI masuk ke dalam antrean konkurensi"
      );

      this.prosesBerikutnya();
    });

    if (kunciPenyatuan) {
      this.permintaanBerjalan.set(kunciPenyatuan, janji);
      janji.finally(() => {
        this.permintaanBerjalan.delete(kunciPenyatuan);
      });
    }

    return janji;
  }

  private prosesBerikutnya(): void {
    if (this.jumlahSedangBerjalan >= this.batasKonkurensi) {
      return;
    }

    let indeksTerpilih = -1;

    for (let i = 0; i < this.antrean.length; i++) {
      const kandidat = this.antrean[i];
      if (!kandidat) continue;

      if (Date.now() - kandidat.waktuMasuk > this.batasWaktuTungguMs) {
        this.antrean.splice(i, 1);
        i--;
        pencatat.warn(
          { id: kandidat.id, idPengguna: kandidat.idPengguna },
          "Tugas AI dibatalkan karena melebihi batas waktu antrean"
        );
        kandidat.gagal(
          new Error("Antrean AI Anya sedang padat sekali. Permintaan kedaluwarsa, silakan coba lagi!")
        );
        continue;
      }

      if (kandidat.prioritas === 1) {
        indeksTerpilih = i;
        break;
      }

      const aktifSekarang = this.tugasAktifPerPengguna.get(kandidat.idPengguna) || 0;
      if (aktifSekarang < this.batasPerPengguna) {
        indeksTerpilih = i;
        break;
      }
    }

    if (indeksTerpilih === -1) {
      return;
    }

    const [item] = this.antrean.splice(indeksTerpilih, 1);
    if (!item) return;

    this.jumlahSedangBerjalan++;
    const aktifSaatIni = this.tugasAktifPerPengguna.get(item.idPengguna) || 0;
    this.tugasAktifPerPengguna.set(item.idPengguna, aktifSaatIni + 1);

    const waktuTunggu = Date.now() - item.waktuMasuk;
    pencatat.info(
      {
        id: item.id,
        idPengguna: item.idPengguna,
        prioritas: item.prioritas,
        waktuTungguMs: waktuTunggu,
        sedangBerjalan: this.jumlahSedangBerjalan,
      },
      "Mengeksekusi tugas AI dari antrean"
    );

    item
      .eksekusi()
      .then((hasil) => {
        item.selesai(hasil);
      })
      .catch((kesalahan) => {
        item.gagal(kesalahan);
      })
      .finally(() => {
        this.jumlahSedangBerjalan--;
        const sisaAktif = (this.tugasAktifPerPengguna.get(item.idPengguna) || 1) - 1;
        if (sisaAktif <= 0) {
          this.tugasAktifPerPengguna.delete(item.idPengguna);
        } else {
          this.tugasAktifPerPengguna.set(item.idPengguna, sisaAktif);
        }

        this.prosesBerikutnya();
      });
  }

  private simpanCache(kunci: string, jawaban: string): void {
    if (this.cacheJawaban.size >= this.kapasitasMaksCache) {
      const kunciTertua = this.cacheJawaban.keys().next().value;
      if (kunciTertua) {
        this.cacheJawaban.delete(kunciTertua);
      }
    }

    this.cacheJawaban.set(kunci, {
      jawaban,
      kedaluwarsa: Date.now() + this.ttlCacheMs,
    });
  }

  public ambilStatistik(): {
    sedangBerjalan: number;
    antreanTersisa: number;
    batasKonkurensi: number;
    kapasitasAntrean: number;
    penggunaAktif: number;
    totalCache: number;
  } {
    return {
      sedangBerjalan: this.jumlahSedangBerjalan,
      antreanTersisa: this.antrean.length,
      batasKonkurensi: this.batasKonkurensi,
      kapasitasAntrean: this.kapasitasAntrean,
      penggunaAktif: this.tugasAktifPerPengguna.size,
      totalCache: this.cacheJawaban.size,
    };
  }
}

export const antreanAi = new AntreanAi();
