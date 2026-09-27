import { buatPencatat } from "../../utils/logger.js";
import { konfigurasiEnv } from "../../config/env.js";

const pencatat = buatPencatat("AntreanPekerjaan");

export type StatusPekerjaan = "menunggu" | "diproses" | "selesai" | "gagal";

interface ItemAntrean<T> {
  id: string;
  namaPekerjaan: string;
  fungsiEksekusi: () => Promise<T>;
  selesaikan: (hasil: T) => void;
  tolak: (alasan: unknown) => void;
  waktuMasuk: number;
}

export class AntreanPekerjaanMedia {
  private readonly antrean: ItemAntrean<any>[] = [];
  private jumlahSedangBerjalan = 0;
  private readonly batasKonkurensi: number;

  constructor(batasKonkurensi?: number) {
    this.batasKonkurensi =
      batasKonkurensi ?? konfigurasiEnv.batasPekerjaanMediaBersamaan;
  }

  public antrekanPekerjaan<T>(
    namaPekerjaan: string,
    fungsiEksekusi: () => Promise<T>
  ): Promise<T> {
    return new Promise<T>((selesaikan, tolak) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const item: ItemAntrean<T> = {
        id,
        namaPekerjaan,
        fungsiEksekusi,
        selesaikan,
        tolak,
        waktuMasuk: Date.now(),
      };

      this.antrean.push(item);
      pencatat.debug(
        {
          id,
          namaPekerjaan,
          sedangBerjalan: this.jumlahSedangBerjalan,
          sisaAntrean: this.antrean.length,
        },
        "Pekerjaan ditambahkan ke dalam antrean"
      );

      this.prosesBerikutnya();
    });
  }

  /**
   * Memproses item berikutnya jika kapasitas konkurensi mencukupi.
   */
  private prosesBerikutnya(): void {
    if (this.jumlahSedangBerjalan >= this.batasKonkurensi) {
      return;
    }

    const item = this.antrean.shift();
    if (!item) {
      return;
    }

    this.jumlahSedangBerjalan++;
    const waktuTunggu = Date.now() - item.waktuMasuk;

    pencatat.info(
      {
        id: item.id,
        namaPekerjaan: item.namaPekerjaan,
        waktuTungguMilidetik: waktuTunggu,
      },
      `Memulai pekerjaan media: ${item.namaPekerjaan}`
    );

    item
      .fungsiEksekusi()
      .then((hasil) => {
        pencatat.info(
          { id: item.id, namaPekerjaan: item.namaPekerjaan },
          `Pekerjaan selesai sukses: ${item.namaPekerjaan}`
        );
        item.selesaikan(hasil);
      })
      .catch((kesalahan) => {
        pencatat.error(
          { id: item.id, namaPekerjaan: item.namaPekerjaan, kesalahan },
          `Pekerjaan gagal: ${item.namaPekerjaan}`
        );
        item.tolak(kesalahan);
      })
      .finally(() => {
        this.jumlahSedangBerjalan--;
        this.prosesBerikutnya();
      });
  }

  public ambilStatistikAntrean(): {
    sedangBerjalan: number;
    antreanTersisa: number;
    batasKonkurensi: number;
  } {
    return {
      sedangBerjalan: this.jumlahSedangBerjalan,
      antreanTersisa: this.antrean.length,
      batasKonkurensi: this.batasKonkurensi,
    };
  }
}

export const antreanPekerjaanMedia = new AntreanPekerjaanMedia();
