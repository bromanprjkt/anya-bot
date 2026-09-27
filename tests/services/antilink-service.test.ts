import { describe, it, expect } from "vitest";
import { LayananAntiTautan } from "../../src/services/moderation/antilink-service.js";

describe("LayananAntiTautan", () => {
  const layanan = new LayananAntiTautan();

  it("harus mendeteksi tautan undangan grup WhatsApp", () => {
    const teksUndangan = "Ayo gabung grup kami https://chat.whatsapp.com/AbCdEfGhIjKlMnOpQrStUv";
    expect(layanan.adalahTautanGrupWhatsApp(teksUndangan)).toBe(true);
    expect(layanan.apakahTautanTerlarang(teksUndangan)).toBe(true);
  });

  it("harus mengizinkan domain yang ada di daftar putih", () => {
    const teksAman = "Cari di google https://www.google.com atau tonton https://youtube.com/watch?v=123";
    expect(layanan.apakahTautanTerlarang(teksAman)).toBe(false);
  });

  it("harus melarang domain yang tidak terdaftar", () => {
    const teksTerlarang = "Kunjungi website ini http://situs-berbahaya.com/login";
    expect(layanan.apakahTautanTerlarang(teksTerlarang)).toBe(true);
  });

  it("harus mengizinkan domain baru setelah ditambahkan ke daftar putih", () => {
    const domainKustom = "mycompany.id";
    layanan.tambahDomainDiizinkan(domainKustom);

    const teksKustom = `Lihat profil kami https://${domainKustom}/about`;
    expect(layanan.apakahTautanTerlarang(teksKustom)).toBe(false);
  });
});
