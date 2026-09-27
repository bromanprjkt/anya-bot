import { describe, it, expect, vi } from "vitest";
import { perintahTTP } from "../../src/commands/media/ttp.js";
import type { KonteksPerintah } from "../../src/core/message-context.js";
import sharp from "sharp";

describe("Perintah TTP (Teks ke Stiker)", () => {
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
      namaPerintah: "ttp",
      argumen: [],
      teksArgumen: "",
      balas: vi.fn(),
      unduhMedia: vi.fn(),
      ...parsial,
    };
  };

  it("harus meminta teks jika tidak ada argumen atau pesan kutipan", async () => {
    const konteks = buatKonteksTiruan({
      teksArgumen: "",
      pesanMentah: { message: {} } as any,
    });

    await perintahTTP.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
    expect((konteks.balas as any).mock.calls[0][0]).toContain("Sertakan teks");
  });

  it("harus menghasilkan stiker teks jika argumen teks diberikan", async () => {
    const sendMessageMock = vi.fn().mockResolvedValue({});
    const konteks = buatKonteksTiruan({
      teksArgumen: "sekali liat langsung #minat",
      soket: {
        sendMessage: sendMessageMock,
      } as any,
    });

    await perintahTTP.jalankan(konteks);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const opsiPesan = sendMessageMock.mock.calls[0][1];
    expect(opsiPesan).toHaveProperty("sticker");

    const metadata = await sharp(opsiPesan.sticker).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
  });

  it("harus mengambil teks dari pesan yang di-reply jika teksArgumen kosong", async () => {
    const sendMessageMock = vi.fn().mockResolvedValue({});
    const konteks = buatKonteksTiruan({
      teksArgumen: "",
      pesanMentah: {
        message: {
          extendedTextMessage: {
            contextInfo: {
              quotedMessage: {
                conversation: "Teks kutipan reply",
              },
            },
          },
        },
      } as any,
      soket: {
        sendMessage: sendMessageMock,
      } as any,
    });

    await perintahTTP.jalankan(konteks);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const opsiPesan = sendMessageMock.mock.calls[0][1];
    expect(opsiPesan).toHaveProperty("sticker");
  });
});
