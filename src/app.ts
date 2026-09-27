import fs from "node:fs";
import path from "node:path";
import { KonfigurasiEnv, konfigurasiEnv } from "./config/env.js";
import { buatPencatat } from "./utils/logger.js";
import type pino from "pino";

/**
 * Kelas inti aplikasi Anya Bot.
 * Bertanggung jawab mengelola daur hidup aplikasi, bootstrap sistem,
 * dan orkestrasi komponen.
 */
export class AplikasiAnya {
  private readonly pencatat: pino.Logger;
  private readonly konfigurasi: KonfigurasiEnv;
  private sedangBerjalan: boolean = false;

  constructor(konfigurasiKustom?: KonfigurasiEnv) {
    this.konfigurasi = konfigurasiKustom ?? konfigurasiEnv;
    this.pencatat = buatPencatat("AplikasiAnya");
  }

  /**
   * Menyiapkan direktori data dan sementara jika belum ada.
   */
  private inisialisasiDirektori(): void {
    const jalurFolderData = path.dirname(this.konfigurasi.jalurDatabase);
    if (!fs.existsSync(jalurFolderData)) {
      fs.mkdirSync(jalurFolderData, { recursive: true });
      this.pencatat.debug({ jalur: jalurFolderData }, "Direktori data berhasil dibuat");
    }

    if (!fs.existsSync(this.konfigurasi.direktoriSementara)) {
      fs.mkdirSync(this.konfigurasi.direktoriSementara, { recursive: true });
      this.pencatat.debug(
        { jalur: this.konfigurasi.direktoriSementara },
        "Direktori sementara berhasil dibuat"
      );
    }
  }

  /**
   * Memulai daur hidup bot Anya.
   */
  public async mulai(): Promise<void> {
    if (this.sedangBerjalan) {
      this.pencatat.warn("Aplikasi sudah dalam keadaan berjalan");
      return;
    }

    this.pencatat.info(
      {
        lingkungan: this.konfigurasi.lingkungan,
        awalanPerintah: this.konfigurasi.awalanPerintah,
      },
      "Memulai inisialisasi Anya Bot..."
    );

    this.inisialisasiDirektori();
    this.sedangBerjalan = true;

    this.pencatat.info("Anya Bot berhasil dimulai dan siap digunakan");
  }

  /**
   * Menghentikan bot secara anggun (graceful shutdown).
   */
  public async berhenti(): Promise<void> {
    if (!this.sedangBerjalan) {
      return;
    }

    this.pencatat.info("Menghentikan Anya Bot...");
    this.sedangBerjalan = false;
    this.pencatat.info("Anya Bot telah berhasil dihentikan");
  }

  /**
   * Memeriksa apakah aplikasi sedang aktif berjalan.
   */
  public apakahSedangBerjalan(): boolean {
    return this.sedangBerjalan;
  }
}
