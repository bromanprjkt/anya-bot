import { describe, it, expect, vi } from "vitest";
import { perintahPing } from "../../src/commands/general/ping.js";
import { perintahOwner } from "../../src/commands/general/owner.js";
import { buatPerintahMenu } from "../../src/commands/general/menu.js";
import { buatPerintahHelp } from "../../src/commands/general/help.js";
import { RegistriPerintah } from "../../src/core/command-registry.js";
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

  it("perintah menu harus menampilkan daftar perintah yang dikelompokkan", async () => {
    const registri = new RegistriPerintah();
    registri.daftarkan(perintahPing);

    const perintahMenu = buatPerintahMenu(registri);
    const konteks = buatKonteksTiruan({ namaPerintah: "menu" });

    await perintahMenu.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
    const pesanBalasan = (konteks.balas as any).mock.calls[0][0];
    expect(pesanBalasan).toContain("!ping");
    expect(pesanBalasan).toContain("Umum");
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
});
