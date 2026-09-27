import { describe, it, expect, vi } from "vitest";
import {
  LayananPengunduh,
  PenyediaApiEksternal,
} from "../../src/services/downloader/downloader-adapter.js";
import { buatPerintahTikTok } from "../../src/commands/media/tiktok.js";
import { buatPerintahInstagram } from "../../src/commands/media/instagram.js";
import type { KonfigurasiEnv } from "../../src/config/env.js";
import type { KonteksPerintah } from "../../src/core/message-context.js";

describe("Layanan Pengunduh & Perintah Media", () => {
  const konfigurasiTiruan: KonfigurasiEnv = {
    lingkungan: "test",
    tingkatLog: "silent",
    awalanPerintah: "!",
    idPemilikBot: "",
    jalurDatabase: "./data/anya.db",
    direktoriSementara: "./temp",
    namaSesi: "sesi-uji",
    batasPekerjaanMediaBersamaan: 2,
    urlApiPengunduh: "",
    kunciApiPengunduh: "",
    bacaPesanOtomatis: true,
  };

  it("penyedia eksternal harus mengenali URL tiktok dan instagram", () => {
    const penyedia = new PenyediaApiEksternal(konfigurasiTiruan);

    expect(penyedia.cocokUrl("https://www.tiktok.com/@user/video/12345")).toBe(true);
    expect(penyedia.cocokUrl("https://vt.tiktok.com/ZS12345/")).toBe(true);
    expect(penyedia.cocokUrl("https://www.instagram.com/reel/Cxxxx/")).toBe(true);
    expect(penyedia.cocokUrl("https://youtube.com/watch?v=123")).toBe(false);
  });

  it("harus mengembalikan pesan kesalahan jika url api pengunduh belum disetel", async () => {
    const penyedia = new PenyediaApiEksternal(konfigurasiTiruan);
    const hasil = await penyedia.unduh("https://vt.tiktok.com/ZS12345/");

    expect(hasil.berhasil).toBe(false);
    expect(hasil.pesanKesalahan).toContain("belum dikonfigurasi");
  });

  it("perintah tiktok harus memvalidasi URL input", async () => {
    const layanan = new LayananPengunduh();
    const perintah = buatPerintahTikTok(layanan);

    const balasMock = vi.fn();
    const konteks = {
      argumen: ["https://google.com"],
      balas: balasMock,
    } as unknown as KonteksPerintah;

    await perintah.jalankan(konteks);

    expect(balasMock).toHaveBeenCalledTimes(1);
    expect(balasMock.mock.calls[0][0]).toContain("Sertakan tautan TikTok yang valid");
  });

  it("perintah instagram harus memvalidasi URL input", async () => {
    const layanan = new LayananPengunduh();
    const perintah = buatPerintahInstagram(layanan);

    const balasMock = vi.fn();
    const konteks = {
      argumen: [],
      balas: balasMock,
    } as unknown as KonteksPerintah;

    await perintah.jalankan(konteks);

    expect(balasMock).toHaveBeenCalledTimes(1);
    expect(balasMock.mock.calls[0][0]).toContain("Sertakan tautan Instagram yang valid");
  });

  it("penyedia scraping anya harus mengenali url tiktok dan instagram", async () => {
    const { PenyediaScrapingAnya } = await import(
      "../../src/services/downloader/anya-scraping-adapter.js"
    );
    const penyedia = new PenyediaScrapingAnya(konfigurasiTiruan);

    expect(penyedia.cocokUrl("https://www.tiktok.com/@user/video/123")).toBe(true);
    expect(penyedia.cocokUrl("https://www.instagram.com/reel/123/")).toBe(true);
    expect(penyedia.cocokUrl("https://facebook.com/123")).toBe(false);

    const hasilTolak = await penyedia.unduh("https://facebook.com/123");
    expect(hasilTolak.berhasil).toBe(false);
  });
});

