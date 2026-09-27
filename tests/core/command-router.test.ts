import { describe, it, expect, vi } from "vitest";
import { PerutePerintah } from "../../src/core/command-router.js";
import { RegistriPerintah } from "../../src/core/command-registry.js";
import { KesalahanValidasi } from "../../src/core/error-handler.js";
import type { KonfigurasiEnv } from "../../src/config/env.js";
import type { WAMessage, WASocket } from "@whiskeysockets/baileys";

describe("PerutePerintah", () => {
  const konfigurasiTiruan: KonfigurasiEnv = {
    lingkungan: "test",
    tingkatLog: "silent",
    awalanPerintah: "!",
    idPemilikBot: "628111@s.whatsapp.net",
    jalurDatabase: "./data/anya.db",
    direktoriSementara: "./temp",
    namaSesi: "sesi-uji",
    batasPekerjaanMediaBersamaan: 2,
    urlApiPengunduh: "",
    kunciApiPengunduh: "",
    bacaPesanOtomatis: true,
  };

  it("harus dapat mengekstrak teks dari berbagai format pesan", () => {
    const registri = new RegistriPerintah();
    const perute = new PerutePerintah(registri, konfigurasiTiruan);

    const pesanTeks = {
      message: { conversation: "halo" },
    } as unknown as WAMessage;
    expect(perute.ekstrakTeksPesan(pesanTeks)).toBe("halo");

    const pesanTeksLanjutan = {
      message: { extendedTextMessage: { text: "!ping" } },
    } as unknown as WAMessage;
    expect(perute.ekstrakTeksPesan(pesanTeksLanjutan)).toBe("!ping");

    const pesanGambar = {
      message: { imageMessage: { caption: "!s" } },
    } as unknown as WAMessage;
    expect(perute.ekstrakTeksPesan(pesanGambar)).toBe("!s");
  });

  it("harus mengarahkan pesan dengan prefix ke handler yang tepat", async () => {
    const registri = new RegistriPerintah();
    const perute = new PerutePerintah(registri, konfigurasiTiruan);

    const aksiMock = vi.fn().mockResolvedValue(undefined);
    registri.daftarkan({
      nama: "tes",
      alias: [],
      deskripsi: "Perintah tes",
      kategori: "general",
      jalankan: aksiMock,
    });

    const pesan = {
      key: { remoteJid: "123@s.whatsapp.net", participant: "123@s.whatsapp.net" },
      message: { conversation: "!tes argumen1 argumen2" },
      pushName: "Budi",
    } as unknown as WAMessage;

    const soketTiruan = {
      sendMessage: vi.fn(),
    } as unknown as WASocket;

    await perute.prosesPesan(soketTiruan, pesan);

    expect(aksiMock).toHaveBeenCalledTimes(1);
    const konteks = aksiMock.mock.calls[0][0];
    expect(konteks.namaPerintah).toBe("tes");
    expect(konteks.argumen).toEqual(["argumen1", "argumen2"]);
  });

  it("harus menangani error perintah dengan mengirim balasan aman", async () => {
    const registri = new RegistriPerintah();
    const perute = new PerutePerintah(registri, konfigurasiTiruan);

    registri.daftarkan({
      nama: "error-test",
      alias: [],
      deskripsi: "Uji error",
      kategori: "general",
      jalankan: async () => {
        throw new KesalahanValidasi("Ukuran file terlalu besar");
      },
    });

    const balasMock = vi.fn();
    const pesan = {
      key: { remoteJid: "123@s.whatsapp.net" },
      message: { conversation: "!error-test" },
    } as unknown as WAMessage;

    const soketTiruan = {
      sendMessage: balasMock,
    } as unknown as WASocket;

    await perute.prosesPesan(soketTiruan, pesan);

    expect(balasMock).toHaveBeenCalledTimes(1);
    expect(balasMock.mock.calls[0][1].text).toContain("Format salah: Ukuran file terlalu besar");
  });
});
