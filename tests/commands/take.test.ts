import { describe, it, expect, vi } from "vitest";
import { perintahTake } from "../../src/commands/media/take.js";
import type { KonteksPerintah } from "../../src/core/message-context.js";
import sharp from "sharp";

describe("Perintah Take / Colong (Stiker ke Foto)", () => {
  const buatKonteksTiruan = (parsial: Partial<KonteksPerintah>): KonteksPerintah => {
    return {
      soket: {
        sendMessage: vi.fn(),
      } as any,
      pesanMentah: { key: { remoteJid: "123@s.whatsapp.net" } } as any,
      idObrolan: "123@s.whatsapp.net",
      idPengguna: "123@s.whatsapp.net",
      namaPengirim: "Penguji",
      adalahGrup: false,
      adalahAdmin: false,
      adalahAdminBot: false,
      adalahPemilik: false,
      namaPerintah: "take",
      argumen: [],
      teksArgumen: "",
      balas: vi.fn(),
      unduhMedia: vi.fn(),
      ...parsial,
    };
  };

  it("harus meminta reply stiker jika tidak ada media yang ditemukan", async () => {
    const konteks = buatKonteksTiruan({
      unduhMedia: vi.fn().mockResolvedValue(null),
    });

    await perintahTake.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
    expect((konteks.balas as any).mock.calls[0][0]).toContain("Balas (reply) stiker");
  });

  it("harus mengonversi stiker menjadi foto dan mengirimkannya via sendMessage", async () => {
    const bufferWebp = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();

    const sendMessageMock = vi.fn().mockResolvedValue({});
    const konteks = buatKonteksTiruan({
      unduhMedia: vi.fn().mockResolvedValue(bufferWebp),
      soket: {
        sendMessage: sendMessageMock,
      } as any,
    });

    await perintahTake.jalankan(konteks);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const opsiPesan = sendMessageMock.mock.calls[0][1];
    expect(opsiPesan).toHaveProperty("image");
    expect(opsiPesan.caption).toContain("Berikut foto hasil konversi stiker");
  });
});
