import { describe, it, expect } from "vitest";
import { periksaIzinPerintah } from "../../src/core/permissions.js";
import type { PerintahBot } from "../../src/core/command-registry.js";
import type { KonteksPerintah } from "../../src/core/message-context.js";

describe("PemeriksaIzin", () => {
  const buatKonteksTiruan = (parsial: Partial<KonteksPerintah>): KonteksPerintah => {
    return {
      soket: {} as any,
      pesanMentah: {} as any,
      idObrolan: "12345@s.whatsapp.net",
      idPengguna: "12345@s.whatsapp.net",
      namaPengirim: "Uji",
      adalahGrup: false,
      adalahAdmin: false,
      adalahAdminBot: false,
      adalahPemilik: false,
      namaPerintah: "test",
      argumen: [],
      teksArgumen: "",
      balas: async () => {},
      unduhMedia: async () => null,
      ...parsial,
    };
  };

  const perintahDasar: PerintahBot = {
    nama: "test",
    alias: [],
    deskripsi: "Uji coba",
    kategori: "general",
    jalankan: async () => {},
  };

  it("harus menolak jika perintah hanya pemilik namun pengguna bukan pemilik", () => {
    const perintah: PerintahBot = { ...perintahDasar, hanyaPemilik: true };
    const konteks = buatKonteksTiruan({ adalahPemilik: false });

    const hasil = periksaIzinPerintah(perintah, konteks);
    expect(hasil.diizinkan).toBe(false);
    expect(hasil.alasanPenolakan).toContain("khusus untuk pemilik bot");
  });

  it("harus mengizinkan jika pengguna adalah pemilik", () => {
    const perintah: PerintahBot = { ...perintahDasar, hanyaPemilik: true };
    const konteks = buatKonteksTiruan({ adalahPemilik: true });

    const hasil = periksaIzinPerintah(perintah, konteks);
    expect(hasil.diizinkan).toBe(true);
  });

  it("harus menolak jika perintah hanya grup namun dieksekusi di obrolan pribadi", () => {
    const perintah: PerintahBot = { ...perintahDasar, hanyaGrup: true };
    const konteks = buatKonteksTiruan({ adalahGrup: false });

    const hasil = periksaIzinPerintah(perintah, konteks);
    expect(hasil.diizinkan).toBe(false);
    expect(hasil.alasanPenolakan).toContain("hanya dapat digunakan di dalam grup");
  });

  it("harus menolak jika perintah butuh admin namun pengguna bukan admin grup", () => {
    const perintah: PerintahBot = { ...perintahDasar, hanyaGrup: true, membutuhkanAdmin: true };
    const konteks = buatKonteksTiruan({ adalahGrup: true, adalahAdmin: false });

    const hasil = periksaIzinPerintah(perintah, konteks);
    expect(hasil.diizinkan).toBe(false);
    expect(hasil.alasanPenolakan).toContain("harus menjadi admin");
  });

  it("harus menolak jika perintah butuh bot admin namun bot bukan admin grup", () => {
    const perintah: PerintahBot = {
      ...perintahDasar,
      hanyaGrup: true,
      membutuhkanAdmin: true,
      membutuhkanBotAdmin: true,
    };
    const konteks = buatKonteksTiruan({
      adalahGrup: true,
      adalahAdmin: true,
      adalahAdminBot: false,
    });

    const hasil = periksaIzinPerintah(perintah, konteks);
    expect(hasil.diizinkan).toBe(false);
    expect(hasil.alasanPenolakan).toContain("Bot harus dijadikan admin");
  });

  it("harus mengizinkan jika semua kondisi terpenuhi", () => {
    const perintah: PerintahBot = {
      ...perintahDasar,
      hanyaGrup: true,
      membutuhkanAdmin: true,
      membutuhkanBotAdmin: true,
    };
    const konteks = buatKonteksTiruan({
      adalahGrup: true,
      adalahAdmin: true,
      adalahAdminBot: true,
    });

    const hasil = periksaIzinPerintah(perintah, konteks);
    expect(hasil.diizinkan).toBe(true);
  });
});
