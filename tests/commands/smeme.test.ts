import { describe, it, expect, vi } from "vitest";
import { perintahSmeme } from "../../src/commands/media/smeme.js";
import type { KonteksPerintah } from "../../src/core/message-context.js";
import sharp from "sharp";

describe("Perintah Smeme (Stiker Meme)", () => {
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
      namaPerintah: "smeme",
      argumen: [],
      teksArgumen: "",
      balas: vi.fn(),
      unduhMedia: vi.fn(),
      ...parsial,
    };
  };

  it("harus meminta teks jika teksArgumen kosong", async () => {
    const konteks = buatKonteksTiruan({
      teksArgumen: "",
      pesanMentah: { message: {} } as any,
    });

    await perintahSmeme.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
    expect((konteks.balas as any).mock.calls[0][0]).toContain("Sertakan teks meme");
  });

  it("harus meminta media jika tidak ada gambar atau stiker yang ditemukan", async () => {
    const konteks = buatKonteksTiruan({
      teksArgumen: "teks atas | teks bawah",
      unduhMedia: vi.fn().mockResolvedValue(null),
    });

    await perintahSmeme.jalankan(konteks);

    expect(konteks.balas).toHaveBeenCalledTimes(1);
    expect((konteks.balas as any).mock.calls[0][0]).toContain("Kirim gambar dengan caption");
  });

  it("harus menghasilkan stiker meme dari gambar dengan format pemisah pipa", async () => {
    const bufferGambar = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 120, g: 80, b: 200, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const sendMessageMock = vi.fn().mockResolvedValue({});
    const konteks = buatKonteksTiruan({
      teksArgumen: "ketika ngoding | langsung jalan",
      unduhMedia: vi.fn().mockResolvedValue(bufferGambar),
      soket: {
        sendMessage: sendMessageMock,
      } as any,
      pesanMentah: {
        key: { remoteJid: "123@s.whatsapp.net" },
        message: {
          imageMessage: {},
        },
      } as any,
    });

    await perintahSmeme.jalankan(konteks);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const opsiPesan = sendMessageMock.mock.calls[0][1];
    expect(opsiPesan).toHaveProperty("sticker");

    const metadata = await sharp(opsiPesan.sticker).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
  });

  it("harus mengonversi stiker kutipan menjadi gambar terlebih dahulu sebelum diproses", async () => {
    const bufferStikerAwal = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 255, g: 255, b: 0, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();

    const sendMessageMock = vi.fn().mockResolvedValue({});
    const konteks = buatKonteksTiruan({
      teksArgumen: "hanya teks",
      unduhMedia: vi.fn().mockResolvedValue(bufferStikerAwal),
      pesanKutipan: {
        idPesan: "1",
        pengirim: "123@s.whatsapp.net",
        teks: "",
        adalahGambar: false,
        adalahVideo: false,
        adalahStiker: true,
        pesanMentah: {},
      },
      soket: {
        sendMessage: sendMessageMock,
      } as any,
      pesanMentah: {
        key: { remoteJid: "123@s.whatsapp.net" },
        message: {
          extendedTextMessage: {
            contextInfo: {
              quotedMessage: {
                stickerMessage: {},
              },
            },
          },
        },
      } as any,
    });

    await perintahSmeme.jalankan(konteks);

    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    const opsiPesan = sendMessageMock.mock.calls[0][1];
    expect(opsiPesan).toHaveProperty("sticker");

    const metadata = await sharp(opsiPesan.sticker).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.width).toBe(512);
    expect(metadata.height).toBe(512);
  });
});
