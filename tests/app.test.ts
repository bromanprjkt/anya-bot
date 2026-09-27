import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { AplikasiAnya } from "../src/app.js";
import { KonfigurasiEnv } from "../src/config/env.js";

describe("AplikasiAnya Bootstrap", () => {
  const direktoriUji = path.join(process.cwd(), "temp", "uji-app");
  const jalurDatabaseUji = path.join(direktoriUji, "data", "uji.db");
  const direktoriSementaraUji = path.join(direktoriUji, "temp");

  const konfigurasiUji: KonfigurasiEnv = {
    lingkungan: "test",
    tingkatLog: "silent",
    awalanPerintah: "!",
    idPemilikBot: "",
    jalurDatabase: jalurDatabaseUji,
    direktoriSementara: direktoriSementaraUji,
    namaSesi: "sesi-uji",
    batasPekerjaanMediaBersamaan: 2,
    urlApiPengunduh: "",
    kunciApiPengunduh: "",
    bacaPesanOtomatis: true,
  };

  beforeEach(() => {
    if (fs.existsSync(direktoriUji)) {
      fs.rmSync(direktoriUji, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(direktoriUji)) {
      fs.rmSync(direktoriUji, { recursive: true, force: true });
    }
  });

  it("harus menginisialisasi aplikasi dengan status belum berjalan", () => {
    const aplikasi = new AplikasiAnya(konfigurasiUji);
    expect(aplikasi.apakahSedangBerjalan()).toBe(false);
  });

  it("harus membuat direktori data dan sementara saat aplikasi dimulai", async () => {
    const aplikasi = new AplikasiAnya(konfigurasiUji);
    await aplikasi.mulai();

    expect(aplikasi.apakahSedangBerjalan()).toBe(true);
    expect(fs.existsSync(path.dirname(jalurDatabaseUji))).toBe(true);
    expect(fs.existsSync(direktoriSementaraUji)).toBe(true);

    await aplikasi.berhenti();
    expect(aplikasi.apakahSedangBerjalan()).toBe(false);
  });

  it("tidak boleh melempar kesalahan jika mulai dipanggil dua kali", async () => {
    const aplikasi = new AplikasiAnya(konfigurasiUji);
    await aplikasi.mulai();
    expect(aplikasi.apakahSedangBerjalan()).toBe(true);

    await expect(aplikasi.mulai()).resolves.toBeUndefined();
    expect(aplikasi.apakahSedangBerjalan()).toBe(true);

    await aplikasi.berhenti();
  });

  it("harus menandai pesan sebagai telah dibaca secara otomatis jika auto-read aktif", async () => {
    const aplikasi = new AplikasiAnya(konfigurasiUji);
    await aplikasi.mulai();

    const bacaPesanMock = vi.fn();
    const soketMock = {
      readMessages: bacaPesanMock,
      sendMessage: vi.fn(),
    } as any;

    const pesanMasukMock = {
      key: {
        remoteJid: "12345@s.whatsapp.net",
        fromMe: false,
        id: "MSG123",
      },
      message: {
        conversation: "Halo bot",
      },
    } as any;

    await aplikasi.tanganiPesanMasuk(soketMock, pesanMasukMock);

    expect(bacaPesanMock).toHaveBeenCalledTimes(1);
    expect(bacaPesanMock).toHaveBeenCalledWith([pesanMasukMock.key]);

    await aplikasi.berhenti();
  });
});
