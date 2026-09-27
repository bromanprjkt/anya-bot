import { describe, it, expect, vi } from "vitest";
import { perintahPing } from "../../src/commands/general/ping.js";
import { perintahOwner } from "../../src/commands/general/owner.js";
import { buatPerintahMenu } from "../../src/commands/general/menu.js";
import { buatPerintahHelp } from "../../src/commands/general/help.js";
import { RegistriPerintah, type PerintahBot } from "../../src/core/command-registry.js";
import type { KonteksPerintah } from "../../src/core/message-context.js";

describe("Perintah Umum (General Commands)", () => {
  const buatKonteksTiruan = (parsial: Partial<KonteksPerintah>): KonteksPerintah => {
    return {
      soket: {} as any,
      pesanMentah: { messageTimestamp: Math.floor(Date.now() / 1000) } as any,
      idObrolan: "123@s.whatsapp.net",
      idPengguna: "123@s.whatsapp.net",
      namaPengirim: "Penguji",
      adalahGrup: false,
      adalahAdmin: false,
      adalahAdminBot: false,
      adalahPemilik: false,
      namaPerintah: "",
      argumen: [],
      teksArgumen: "",
      balas: vi.fn(),
      unduhMedia: vi.fn(),
      ...parsial,
    };
  };

  it("perintah ping harus membalas dengan latensi", async () => {
    const konteks = buatKonteksTiruan({ namaPerintah: "ping" });
    await perintahPing.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
    const pesanBalasan = (konteks.balas as any).mock.calls[0][0];
    expect(pesanBalasan).toContain("Pong!");
    expect(pesanBalasan).toContain("Kecepatan respon");
  });

  it("perintah owner harus membalas kontak pemilik bot", async () => {
    const konteks = buatKonteksTiruan({ namaPerintah: "owner" });
    await perintahOwner.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
  });

  it("perintah menu harus menyembunyikan perintah grup dan admin dari pengguna biasa di private chat", async () => {
    const registri = new RegistriPerintah();
    registri.daftarkan(perintahPing);

    const perintahGrupDummy: PerintahBot = {
      nama: "tagall",
      alias: [],
      deskripsi: "Tag all",
      kategori: "group",
      hanyaGrup: true,
      membutuhkanAdmin: true,
      jalankan: async () => {},
    };
    registri.daftarkan(perintahGrupDummy);

    const perintahAdminDummy: PerintahBot = {
      nama: "botstats",
      alias: [],
      deskripsi: "Stats",
      kategori: "admin",
      hanyaPemilik: true,
      jalankan: async () => {},
    };
    registri.daftarkan(perintahAdminDummy);

    const perintahMenu = buatPerintahMenu(registri);
    const konteks = buatKonteksTiruan({
      namaPerintah: "menu",
      adalahGrup: false,
      adalahAdmin: false,
      adalahPemilik: false,
    });

    await perintahMenu.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
    const pesanBalasan = (konteks.balas as any).mock.calls[0][0];

    expect(pesanBalasan).toContain("!ping");
    expect(pesanBalasan).toContain("Umum");

    expect(pesanBalasan).not.toContain("!tagall");
    expect(pesanBalasan).not.toContain("!botstats");
    expect(pesanBalasan).not.toContain("Alat Grup");
    expect(pesanBalasan).not.toContain("Khusus Admin Bot");
  });

  it("perintah menu harus menampilkan perintah grup jika pengguna adalah admin grup", async () => {
    const registri = new RegistriPerintah();
    registri.daftarkan({
      nama: "tagall",
      alias: ["all"],
      deskripsi: "Tag all",
      kategori: "group",
      hanyaGrup: true,
      membutuhkanAdmin: true,
      jalankan: async () => {},
    });

    const perintahMenu = buatPerintahMenu(registri);
    const konteks = buatKonteksTiruan({
      namaPerintah: "menu",
      adalahGrup: true,
      adalahAdmin: true,
      adalahPemilik: false,
    });

    await perintahMenu.jalankan(konteks);

    const pesanBalasan = (konteks.balas as any).mock.calls[0][0];
    expect(pesanBalasan).toContain("!tagall / !all");
    expect(pesanBalasan).toContain("Alat Grup");
  });

  it("perintah help harus menampilkan detail informasi perintah", async () => {
    const registri = new RegistriPerintah();
    registri.daftarkan(perintahPing);

    const perintahHelp = buatPerintahHelp(registri);
    const konteks = buatKonteksTiruan({
      namaPerintah: "help",
      argumen: ["ping"],
    });

    await perintahHelp.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
    const pesanBalasan = (konteks.balas as any).mock.calls[0][0];
    expect(pesanBalasan).toContain("!ping");
    expect(pesanBalasan).toContain("Mengecek kecepatan respon bot");
  });

  it("perintah menu harus mengirimkan banner gambar jika soket mendukung sendMessage", async () => {
    const registri = new RegistriPerintah();
    registri.daftarkan(perintahPing);

    const kirimPesanMock = vi.fn();
    const perintahMenu = buatPerintahMenu(registri);
    const konteks = buatKonteksTiruan({
      namaPerintah: "menu",
      soket: {
        sendMessage: kirimPesanMock,
      } as any,
    });

    await perintahMenu.jalankan(konteks);

    expect(kirimPesanMock).toHaveBeenCalledTimes(1);
    const opsiPesan = kirimPesanMock.mock.calls[0][1];
    expect(opsiPesan).toHaveProperty("image");
    expect(opsiPesan.caption).toContain("*Anya Bot*");
    expect(opsiPesan.caption).toContain("!ping");
  });
});

