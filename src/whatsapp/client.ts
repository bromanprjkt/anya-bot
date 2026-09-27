import makeWASocket, {
  type WASocket,
  fetchLatestBaileysVersion,
  Browsers,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import path from "node:path";
import { KonfigurasiEnv } from "../config/env.js";
import { buatPencatat } from "../utils/logger.js";
import { inisialisasiSesiWhatsApp, type HasilManajerSesi } from "./session.js";
import {
  daftarkanAcaraWhatsApp,
  type PendengarAcaraPesan,
  type PendengarAcaraGrup,
} from "./events.js";

export class KlienWhatsApp {
  private readonly pencatat = buatPencatat("KlienWhatsApp");
  private soket: WASocket | null = null;
  private pengelolaSesi: HasilManajerSesi | null = null;
  private sedangMenghubungkan: boolean = false;
  private penundaKoneksiUlang: NodeJS.Timeout | null = null;
  private readonly jedaKoneksiUlangMilidetik = 5000;

  constructor(
    private readonly konfigurasi: KonfigurasiEnv,
    private readonly pendengarPesan?: PendengarAcaraPesan,
    private readonly pendengarGrup?: PendengarAcaraGrup
  ) {}

  /**
   * Menginisialisasi soket Baileys dan menghubungkan ke jaringan WhatsApp.
   */
  public async hubungkan(): Promise<void> {
    if (this.sedangMenghubungkan) {
      this.pencatat.warn("Proses koneksi WhatsApp sedang berjalan...");
      return;
    }

    this.sedangMenghubungkan = true;

    try {
      const jalurSesi = path.join(
        path.dirname(this.konfigurasi.jalurDatabase),
        this.konfigurasi.namaSesi
      );

      this.pengelolaSesi = await inisialisasiSesiWhatsApp(jalurSesi);
      const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({
        version: [2, 3000, 1043857760] as [number, number, number],
        isLatest: false,
      }));

      this.pencatat.info(
        { versiBaileys: version.join("."), versiTerbaru: isLatest },
        "Membuat soket koneksi WhatsApp"
      );

      const pencatatSoket = buatPencatat("BaileysSocket");

      const soketBaru = makeWASocket({
        version,
        auth: {
          creds: this.pengelolaSesi.statusAutentikasi.creds,
          keys: makeCacheableSignalKeyStore(
            this.pengelolaSesi.statusAutentikasi.keys,
            pencatatSoket as any
          ),
        },
        printQRInTerminal: false,
        logger: pencatatSoket as any,
        browser: Browsers.ubuntu("Chrome"),
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 250,
      });

      this.soket = soketBaru;

      daftarkanAcaraWhatsApp(
        soketBaru,
        this.pengelolaSesi.simpanKredensial,
        () => this.jadwalkanKoneksiUlang(),
        this.pendengarPesan,
        this.pendengarGrup
      );
    } catch (kesalahan) {
      this.pencatat.error({ kesalahan }, "Gagal menginisialisasi soket WhatsApp");
      this.jadwalkanKoneksiUlang();
    } finally {
      this.sedangMenghubungkan = false;
    }
  }

  /**
   * Menjadwalkan percobaan koneksi ulang jika terjadi diskoneksi.
   */
  private jadwalkanKoneksiUlang(): void {
    if (this.penundaKoneksiUlang) {
      clearTimeout(this.penundaKoneksiUlang);
    }

    this.pencatat.info(
      { jedaMilidetik: this.jedaKoneksiUlangMilidetik },
      "Menjadwalkan koneksi ulang..."
    );

    this.penundaKoneksiUlang = setTimeout(() => {
      void this.hubungkan();
    }, this.jedaKoneksiUlangMilidetik);
  }

  /**
   * Memutuskan koneksi soket secara aman.
   */
  public async putuskan(): Promise<void> {
    if (this.penundaKoneksiUlang) {
      clearTimeout(this.penundaKoneksiUlang);
      this.penundaKoneksiUlang = null;
    }

    if (this.soket) {
      this.pencatat.info("Menutup soket WhatsApp...");
      try {
        this.soket.end(undefined);
      } catch (kesalahan) {
        this.pencatat.warn({ kesalahan }, "Peringatan saat menutup soket");
      }
      this.soket = null;
    }
  }

  /**
   * Mengambil instance soket aktif saat ini.
   */
  public ambilSoket(): WASocket | null {
    return this.soket;
  }
}
