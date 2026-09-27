import fs from "node:fs";
import path from "node:path";
import type { WASocket, WAMessage, ParticipantAction } from "@whiskeysockets/baileys";
import { KonfigurasiEnv, konfigurasiEnv } from "./config/env.js";
import { buatPencatat } from "./utils/logger.js";
import type pino from "pino";

// Core
import { RegistriPerintah } from "./core/command-registry.js";
import { PerutePerintah } from "./core/command-router.js";
import { pembatasFrekuensi } from "./core/rate-limiter.js";

// WhatsApp
import { KlienWhatsApp } from "./whatsapp/client.js";

// Repositori
import { ambilBasisData } from "./repositories/database.js";
import { repositoriGrup } from "./repositories/group-repository.js";
import { repositoriPengguna } from "./repositories/user-repository.js";

// Layanan
import { layananAntiTautan } from "./services/moderation/antilink-service.js";
import { layananPenyimpananSementara } from "./services/storage/temp-storage.js";
import {
  LayananPengunduh,
  PenyediaApiEksternal,
} from "./services/downloader/downloader-adapter.js";
import { PenyediaScrapingAnya } from "./services/downloader/anya-scraping-adapter.js";

// Perintah
import { perintahPing } from "./commands/general/ping.js";
import { perintahOwner } from "./commands/general/owner.js";
import { buatPerintahMenu } from "./commands/general/menu.js";
import { buatPerintahHelp } from "./commands/general/help.js";

import { perintahSticker } from "./commands/media/sticker.js";
import { perintahToImg } from "./commands/media/toimg.js";
import { perintahTake } from "./commands/media/take.js";
import { perintahQC } from "./commands/media/qc.js";
import { buatPerintahTikTok } from "./commands/media/tiktok.js";
import { buatPerintahInstagram } from "./commands/media/instagram.js";

import { perintahTagAll } from "./commands/group/tagall.js";
import { perintahGroupInfo } from "./commands/group/groupinfo.js";
import { perintahAdmins } from "./commands/group/admins.js";
import { perintahWelcome } from "./commands/group/welcome.js";
import { perintahGoodbye } from "./commands/group/goodbye.js";

import { perintahAntiLink } from "./commands/moderation/antilink.js";
import { perintahAntiSpam } from "./commands/moderation/antispam.js";
import { perintahWarn } from "./commands/moderation/warn.js";
import { perintahWarnings } from "./commands/moderation/warnings.js";

import { perintahBotStats } from "./commands/admin/botstats.js";
import { perintahMaintenance, apakahModePemeliharaan } from "./commands/admin/maintenance.js";
import { perintahAutoRead, apakahBacaOtomatisAktif } from "./commands/admin/autoread.js";

export class AplikasiAnya {
  private readonly pencatat: pino.Logger;
  private readonly konfigurasi: KonfigurasiEnv;
  private readonly registriPerintah: RegistriPerintah;
  private readonly perutePerintah: PerutePerintah;
  private readonly layananPengunduh: LayananPengunduh;
  private klienWhatsApp: KlienWhatsApp | null = null;
  private intervalPembersihSementara: NodeJS.Timeout | null = null;
  private sedangBerjalan: boolean = false;

  constructor(konfigurasiKustom?: KonfigurasiEnv) {
    this.konfigurasi = konfigurasiKustom ?? konfigurasiEnv;
    this.pencatat = buatPencatat("AplikasiAnya");

    this.registriPerintah = new RegistriPerintah();
    this.perutePerintah = new PerutePerintah(this.registriPerintah, this.konfigurasi);

    this.layananPengunduh = new LayananPengunduh();
    this.layananPengunduh.daftarkanPenyedia(new PenyediaScrapingAnya(this.konfigurasi));
    this.layananPengunduh.daftarkanPenyedia(new PenyediaApiEksternal(this.konfigurasi));

    this.daftarkanSemuaPerintah();
  }

  /**
   * Mendaftarkan seluruh perintah bot ke registri perintah pusat.
   */
  private daftarkanSemuaPerintah(): void {
    // Kategori: General
    this.registriPerintah.daftarkan(perintahPing);
    this.registriPerintah.daftarkan(perintahOwner);
    this.registriPerintah.daftarkan(buatPerintahMenu(this.registriPerintah));
    this.registriPerintah.daftarkan(buatPerintahHelp(this.registriPerintah));

    // Kategori: Sticker & Media
    this.registriPerintah.daftarkan(perintahSticker);
    this.registriPerintah.daftarkan(perintahToImg);
    this.registriPerintah.daftarkan(perintahTake);
    this.registriPerintah.daftarkan(perintahQC);

    // Kategori: Downloader
    this.registriPerintah.daftarkan(buatPerintahTikTok(this.layananPengunduh));
    this.registriPerintah.daftarkan(buatPerintahInstagram(this.layananPengunduh));

    // Kategori: Group
    this.registriPerintah.daftarkan(perintahTagAll);
    this.registriPerintah.daftarkan(perintahGroupInfo);
    this.registriPerintah.daftarkan(perintahAdmins);
    this.registriPerintah.daftarkan(perintahWelcome);
    this.registriPerintah.daftarkan(perintahGoodbye);

    // Kategori: Moderation
    this.registriPerintah.daftarkan(perintahAntiLink);
    this.registriPerintah.daftarkan(perintahAntiSpam);
    this.registriPerintah.daftarkan(perintahWarn);
    this.registriPerintah.daftarkan(perintahWarnings);

    // Kategori: Admin
    this.registriPerintah.daftarkan(perintahBotStats);
    this.registriPerintah.daftarkan(perintahMaintenance);
    this.registriPerintah.daftarkan(perintahAutoRead);

    this.pencatat.info(
      { totalPerintah: this.registriPerintah.ambilSemua().length },
      "Seluruh modul perintah Anya Bot berhasil didaftarkan"
    );
  }

  /**
   * Menyiapkan direktori penyimpanan lokal jika belum ada.
   */
  private inisialisasiDirektori(): void {
    const jalurFolderData = path.dirname(this.konfigurasi.jalurDatabase);
    if (!fs.existsSync(jalurFolderData)) {
      fs.mkdirSync(jalurFolderData, { recursive: true });
    }

    if (!fs.existsSync(this.konfigurasi.direktoriSementara)) {
      fs.mkdirSync(this.konfigurasi.direktoriSementara, { recursive: true });
    }
  }

  /**
   * Menangani pemrosesan pesan masuk WhatsApp dengan filter moderasi.
   */
  public async tanganiPesanMasuk(soket: WASocket, pesan: WAMessage): Promise<void> {
    const idObrolan = pesan.key.remoteJid ?? "";
    const adalahGrup = idObrolan.endsWith("@g.us");
    const idPengirim = adalahGrup
      ? (pesan.key.participant ?? pesan.participant ?? "")
      : idObrolan;
    const namaPengirim = pesan.pushName ?? "Pengguna";

    // Auto Read: Tandai pesan sebagai telah dibaca (centang biru) otomatis
    if (apakahBacaOtomatisAktif() && pesan.key && !pesan.key.fromMe) {
      try {
        await soket.readMessages([pesan.key]);
      } catch (kesalahan) {
        this.pencatat.debug({ kesalahan }, "Gagal menandai pesan otomatis sebagai dibaca");
      }
    }

    // Catat statistik pesan pengguna
    repositoriPengguna.tambahPesanPengguna(idPengirim, namaPengirim);

    const teksPesan = this.perutePerintah.ekstrakTeksPesan(pesan);

    // Proteksi Moderasi Anti-Link jika aktif di grup
    if (adalahGrup && repositoriGrup.apakahAntilinkAktif(idObrolan)) {
      if (layananAntiTautan.apakahTautanTerlarang(teksPesan)) {
        this.pencatat.warn(
          { pengirim: idPengirim, idObrolan },
          "Tautan terlarang terdeteksi oleh modul Anti-Link"
        );

        await soket.sendMessage(
          idObrolan,
          {
            text: `⚠️ @${idPengirim.split("@")[0]}, tautan terlarang dilarang dikirim di grup ini!`,
            mentions: [idPengirim],
          },
          { quoted: pesan }
        );
        return;
      }
    }

    // Proteksi Moderasi Anti-Spam
    if (adalahGrup && repositoriGrup.apakahAntispamAktif(idObrolan)) {
      const hasilBatas = pembatasFrekuensi.periksaBatas(`spam:${idPengirim}`, 5, 5000);
      if (!hasilBatas.diizinkan) {
        this.pencatat.warn({ idPengirim }, "Pesan pengguna melampaui batas frekuensi Anti-Spam");
        return; // Abaikan pesan spam
      }
    }

    // Periksa apakah bot dalam mode pemeliharaan
    if (apakahModePemeliharaan()) {
      const nomorPemilik = this.konfigurasi.idPemilikBot.replace(/[^0-9]/g, "");
      const nomorPengirim = idPengirim.replace(/[^0-9]/g, "");
      const adalahPemilik = Boolean(nomorPemilik && nomorPengirim.startsWith(nomorPemilik));

      if (!adalahPemilik && teksPesan.startsWith(this.konfigurasi.awalanPerintah)) {
        await soket.sendMessage(
          idObrolan,
          { text: "Anya Bot sedang dalam mode pemeliharaan (maintenance). Silakan coba lagi nanti." },
          { quoted: pesan }
        );
        return;
      }
    }

    // Rute pesan ke perintah
    await this.perutePerintah.prosesPesan(soket, pesan);
  }

  /**
   * Menangani acara pembaruan peserta grup (welcome / goodbye).
   */
  public async tanganiPembaruanPeserta(
    soket: WASocket,
    idGrup: string,
    peserta: string[],
    tindakan: ParticipantAction
  ): Promise<void> {
    if (tindakan === "add" && repositoriGrup.apakahWelcomeAktif(idGrup)) {
      for (const jid of peserta) {
        const nomor = jid.split("@")[0];
        await soket.sendMessage(idGrup, {
          text: `Halo @${nomor}, selamat datang di grup! Semoga betah dan patuhi aturan grup ya.`,
          mentions: [jid],
        });
      }
    } else if (tindakan === "remove" && repositoriGrup.apakahGoodbyeAktif(idGrup)) {
      for (const jid of peserta) {
        const nomor = jid.split("@")[0];
        await soket.sendMessage(idGrup, {
          text: `Selamat tinggal @${nomor}. Sampai jumpa di lain kesempatan!`,
          mentions: [jid],
        });
      }
    }
  }

  /**
   * Memulai aplikasi dan menghubungkan ke WhatsApp.
   */
  public async mulai(hubungkanWhatsApp: boolean = true): Promise<void> {
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
    ambilBasisData(this.konfigurasi.jalurDatabase);

    // Jalankan pembersihan berkas sementara setiap 30 menit
    this.intervalPembersihSementara = setInterval(() => {
      void layananPenyimpananSementara.bersihkanBerkasKedaluwarsa();
      pembatasFrekuensi.bersihkanDataUsang();
    }, 30 * 60 * 1000);

    this.sedangBerjalan = true;

    if (hubungkanWhatsApp && this.konfigurasi.lingkungan !== "test") {
      this.klienWhatsApp = new KlienWhatsApp(
        this.konfigurasi,
        {
          tanganiPesanMasuk: (soket, pesan) => this.tanganiPesanMasuk(soket, pesan),
        },
        {
          tanganiPembaruanPeserta: (soket, idGrup, peserta, aksi) =>
            this.tanganiPembaruanPeserta(soket, idGrup, peserta, aksi),
        }
      );

      await this.klienWhatsApp.hubungkan();
    }

    this.pencatat.info("Anya Bot berhasil dimulai dan siap digunakan");
  }

  /**
   * Menghentikan bot secara aman (graceful shutdown).
   */
  public async berhenti(): Promise<void> {
    if (!this.sedangBerjalan) {
      return;
    }

    this.pencatat.info("Menghentikan Anya Bot...");

    if (this.intervalPembersihSementara) {
      clearInterval(this.intervalPembersihSementara);
      this.intervalPembersihSementara = null;
    }

    if (this.klienWhatsApp) {
      await this.klienWhatsApp.putuskan();
      this.klienWhatsApp = null;
    }

    this.sedangBerjalan = false;
    this.pencatat.info("Anya Bot telah berhasil dihentikan");
  }

  public apakahSedangBerjalan(): boolean {
    return this.sedangBerjalan;
  }

  public ambilRegistriPerintah(): RegistriPerintah {
    return this.registriPerintah;
  }
}
