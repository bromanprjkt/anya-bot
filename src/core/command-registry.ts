import type { KonteksPerintah } from "./message-context.js";
import { buatPencatat } from "../utils/logger.js";

const pencatat = buatPencatat("RegistriPerintah");

export type KategoriPerintah =
  | "general"
  | "sticker"
  | "group"
  | "moderation"
  | "admin"
  | "downloader";

export interface PerintahBot {
  nama: string;
  alias: string[];
  deskripsi: string;
  kategori: KategoriPerintah;
  membutuhkanAdmin?: boolean;
  membutuhkanBotAdmin?: boolean;
  hanyaGrup?: boolean;
  hanyaPemilik?: boolean;
  jalankan: (konteks: KonteksPerintah) => Promise<void>;
}

export class RegistriPerintah {
  private readonly daftarPerintah = new Map<string, PerintahBot>();
  private readonly petaAlias = new Map<string, string>();

  /**
   * Mendaftarkan perintah baru ke dalam registri.
   */
  public daftarkan(perintah: PerintahBot): void {
    const namaNormal = perintah.nama.toLowerCase();

    if (this.daftarPerintah.has(namaNormal)) {
      pencatat.warn({ nama: namaNormal }, "Perintah sudah terdaftar, menimpa yang lama");
    }

    this.daftarPerintah.set(namaNormal, perintah);

    for (const alias of perintah.alias) {
      const aliasNormal = alias.toLowerCase();
      this.petaAlias.set(aliasNormal, namaNormal);
    }

    pencatat.debug({ nama: namaNormal, alias: perintah.alias }, "Perintah berhasil didaftarkan");
  }

  /**
   * Mencari perintah berdasarkan nama atau alias.
   */
  public cariPerintah(namaAtauAlias: string): PerintahBot | undefined {
    const kunciNormal = namaAtauAlias.toLowerCase();

    if (this.daftarPerintah.has(kunciNormal)) {
      return this.daftarPerintah.get(kunciNormal);
    }

    const namaAsli = this.petaAlias.get(kunciNormal);
    if (namaAsli) {
      return this.daftarPerintah.get(namaAsli);
    }

    return undefined;
  }

  /**
   * Mengambil semua perintah yang terdaftar.
   */
  public ambilSemua(): PerintahBot[] {
    return Array.from(this.daftarPerintah.values());
  }

  /**
   * Mengambil daftar perintah yang dikelompokkan berdasarkan kategori.
   */
  public ambilBerdasarkanKategori(): Map<KategoriPerintah, PerintahBot[]> {
    const hasil = new Map<KategoriPerintah, PerintahBot[]>();

    for (const perintah of this.daftarPerintah.values()) {
      const daftar = hasil.get(perintah.kategori) ?? [];
      daftar.push(perintah);
      hasil.set(perintah.kategori, daftar);
    }

    return hasil;
  }
}
