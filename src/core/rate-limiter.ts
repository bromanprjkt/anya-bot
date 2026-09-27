interface CatatanFrekuensi {
  stempelWaktu: number[];
}

export interface HasilBatasFrekuensi {
  diizinkan: boolean;
  sisaWaktuMilidetik: number;
  totalPermintaan: number;
}

export class PembatasFrekuensi {
  private readonly petaCatatan = new Map<string, CatatanFrekuensi>();

  public periksaBatas(
    kunci: string,
    batasMaksimal: number = 5,
    jendelaMilidetik: number = 10000
  ): HasilBatasFrekuensi {
    const sekarang = Date.now();
    let catatan = this.petaCatatan.get(kunci);

    if (!catatan) {
      catatan = { stempelWaktu: [] };
      this.petaCatatan.set(kunci, catatan);
    }

    catatan.stempelWaktu = catatan.stempelWaktu.filter(
      (waktu) => sekarang - waktu < jendelaMilidetik
    );

    if (catatan.stempelWaktu.length >= batasMaksimal) {
      const stempelTertua = catatan.stempelWaktu[0] ?? sekarang;
      const sisaWaktu = Math.max(0, jendelaMilidetik - (sekarang - stempelTertua));

      return {
        diizinkan: false,
        sisaWaktuMilidetik: sisaWaktu,
        totalPermintaan: catatan.stempelWaktu.length,
      };
    }

    catatan.stempelWaktu.push(sekarang);

    return {
      diizinkan: true,
      sisaWaktuMilidetik: 0,
      totalPermintaan: catatan.stempelWaktu.length,
    };
  }

  public reset(kunci?: string): void {
    if (kunci) {
      this.petaCatatan.delete(kunci);
    } else {
      this.petaCatatan.clear();
    }
  }

  public bersihkanDataUsang(kedaluwarsaMilidetik: number = 60000): void {
    const sekarang = Date.now();
    for (const [kunci, catatan] of this.petaCatatan.entries()) {
      catatan.stempelWaktu = catatan.stempelWaktu.filter(
        (waktu) => sekarang - waktu < kedaluwarsaMilidetik
      );
      if (catatan.stempelWaktu.length === 0) {
        this.petaCatatan.delete(kunci);
      }
    }
  }
}

export const pembatasFrekuensi = new PembatasFrekuensi();
