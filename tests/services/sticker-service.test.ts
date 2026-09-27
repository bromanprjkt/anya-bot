import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { LayananStiker } from "../../src/services/media/sticker-service.js";

describe("LayananStiker", () => {
  const layanan = new LayananStiker();

  it("harus mengonversi gambar ke stiker WebP 512x512 dengan metadata", async () => {
    // Buat gambar PNG uji berukuran 100x100 berwarna merah
    const bufferGambar = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const stikerBuffer = await layanan.gambarKeStiker(bufferGambar, {
      namaPaket: "Paket Uji",
      pembuat: "Tester",
    });

    expect(stikerBuffer).toBeDefined();
    expect(stikerBuffer.length).toBeGreaterThan(0);

    const infoMetadata = await sharp(stikerBuffer).metadata();
    expect(infoMetadata.format).toBe("webp");
    expect(infoMetadata.width).toBe(512);
    expect(infoMetadata.height).toBe(512);
  });

  it("harus mengonversi stiker kembali ke format gambar PNG", async () => {
    const bufferGambar = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 0, g: 255, b: 0, alpha: 1 },
      },
    })
      .webp()
      .toBuffer();

    const bufferHasil = await layanan.stikerKeGambar(bufferGambar);
    const info = await sharp(bufferHasil).metadata();
    expect(info.format).toBe("png");
  });

  it("harus membuat stiker kutipan percakapan (QC)", async () => {
    const stikerQC = await layanan.buatStikerKutipan("Halo Dunia", "Tester");
    expect(stikerQC).toBeDefined();
    const info = await sharp(stikerQC).metadata();
    expect(info.format).toBe("webp");
  });

  it("harus membuat stiker teks (TTP) multi-baris berformat WebP 512x512", async () => {
    const stikerTeks = await layanan.buatStikerTeks("sekali liat langsung #minat");
    expect(stikerTeks).toBeDefined();
    expect(stikerTeks.length).toBeGreaterThan(0);

    const info = await sharp(stikerTeks).metadata();
    expect(info.format).toBe("webp");
    expect(info.width).toBe(512);
    expect(info.height).toBe(512);
  });
});
