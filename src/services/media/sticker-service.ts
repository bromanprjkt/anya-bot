import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "node:fs/promises";
import { buatPencatat } from "../../utils/logger.js";
import { layananPenyimpananSementara } from "../storage/temp-storage.js";

const pencatat = buatPencatat("LayananStiker");

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

export interface MetadataStiker {
  namaPaket?: string;
  pembuat?: string;
}

/**
 * Membangun buffer EXIF WebP untuk metadata stiker WhatsApp.
 */
function buatBufferExif(namaPaket: string = "Anya Bot", pembuat: string = "Anya Team"): Buffer {
  const jsonMetadata = {
    "sticker-pack-id": "anya-bot-pack",
    "sticker-pack-name": namaPaket,
    "sticker-pack-publisher": pembuat,
    emojis: ["✨"],
  };

  const stringJson = JSON.stringify(jsonMetadata);
  const panjangJson = Buffer.byteLength(stringJson, "utf8");

  // Format header EXIF TIFF standar untuk stiker WebP WhatsApp
  const tajukTiff = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
    0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);

  tajukTiff.writeUInt32LE(panjangJson, 14);

  const payload = Buffer.concat([tajukTiff, Buffer.from(stringJson, "utf8")]);
  const headerExif = Buffer.from([
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00,
  ]);

  return Buffer.concat([headerExif, payload]);
}

/**
 * Menyisipkan chunk EXIF ke dalam berkas WebP sesuai standar Extended WebP (VP8X).
 */
function sisipkanExifKeWebp(
  bufferWebp: Buffer,
  bufferExif: Buffer,
  lebar: number = 512,
  tinggi: number = 512
): Buffer {
  if (
    bufferWebp.length < 12 ||
    bufferWebp.toString("ascii", 0, 4) !== "RIFF" ||
    bufferWebp.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return bufferWebp;
  }

  const chunkFourCC = bufferWebp.toString("ascii", 12, 16);

  // Buat chunk EXIF: 'EXIF' + 4-byte size + data (+ padding byte jika ganjil)
  const panjangExif = bufferExif.length;
  const chunkExif = Buffer.alloc(8 + panjangExif + (panjangExif % 2));
  chunkExif.write("EXIF", 0, 4, "ascii");
  chunkExif.writeUInt32LE(panjangExif, 4);
  bufferExif.copy(chunkExif, 8);

  if (chunkFourCC === "VP8X") {
    // Jika sudah memiliki header VP8X, aktifkan flag bit EXIF (bit 3: 0x08)
    const salinan = Buffer.from(bufferWebp);
    salinan[20] = (salinan[20] ?? 0) | 0x08;
    const hasilAkhir = Buffer.concat([salinan, chunkExif]);
    hasilAkhir.writeUInt32LE(hasilAkhir.length - 8, 4);
    return hasilAkhir;
  }

  // Jika WebP sederhana (VP8 / VP8L), bangun header VP8X
  const chunkVp8x = Buffer.alloc(18);
  chunkVp8x.write("VP8X", 0, 4, "ascii");
  chunkVp8x.writeUInt32LE(10, 4);
  chunkVp8x[8] = 0x08; // Flag bit EXIF

  const l = lebar - 1;
  chunkVp8x[12] = l & 0xff;
  chunkVp8x[13] = (l >> 8) & 0xff;
  chunkVp8x[14] = (l >> 16) & 0xff;

  const t = tinggi - 1;
  chunkVp8x[15] = t & 0xff;
  chunkVp8x[16] = (t >> 8) & 0xff;
  chunkVp8x[17] = (t >> 16) & 0xff;

  const headerRiff = Buffer.alloc(12);
  headerRiff.write("RIFF", 0, 4, "ascii");
  headerRiff.write("WEBP", 8, 4, "ascii");

  const sisaChunks = bufferWebp.subarray(12);
  const hasilAkhir = Buffer.concat([headerRiff, chunkVp8x, sisaChunks, chunkExif]);
  hasilAkhir.writeUInt32LE(hasilAkhir.length - 8, 4);
  return hasilAkhir;
}

export class LayananStiker {
  /**
   * Mengonversi buffer gambar (JPEG, PNG, dsb.) menjadi stiker WebP 512x512.
   */
  public async gambarKeStiker(
    bufferGambar: Buffer,
    metadata?: MetadataStiker
  ): Promise<Buffer> {
    pencatat.debug("Mengonversi gambar ke stiker WebP");

    const webpBuffer = await sharp(bufferGambar)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .webp({ quality: 80 })
      .toBuffer();

    const exif = buatBufferExif(metadata?.namaPaket, metadata?.pembuat);
    return sisipkanExifKeWebp(webpBuffer, exif);
  }

  /**
   * Mengonversi buffer video atau GIF pendek menjadi stiker animasi WebP.
   */
  public async videoKeStikerAnimasi(
    bufferVideo: Buffer,
    metadata?: MetadataStiker
  ): Promise<Buffer> {
    pencatat.debug("Mengonversi video ke stiker animasi WebP");

    return await layananPenyimpananSementara.bungkusDenganPembersihan(
      async (jalurInput) => {
        await fs.writeFile(jalurInput, bufferVideo);

        return await layananPenyimpananSementara.bungkusDenganPembersihan(
          async (jalurOutput) => {
            await new Promise<void>((selesai, tolak) => {
              ffmpeg(jalurInput)
                .inputOptions(["-t 10"]) // Batas durasi maksimal 10 detik
                .outputOptions([
                  "-vcodec libwebp",
                  "-vf scale=512:512:force_original_aspect_ratio=decrease,fps=15,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0",
                  "-loop 0",
                  "-ss 00:00:00",
                  "-t 00:00:09",
                  "-preset default",
                  "-an",
                  "-vsync 0",
                  "-s 512:512",
                  "-quality 60",
                  "-fs 1000k",
                ])
                .toFormat("webp")
                .save(jalurOutput)
                .on("end", () => selesai())
                .on("error", (err) => tolak(err));
            });

            const bufferHasil = await fs.readFile(jalurOutput);
            const exif = buatBufferExif(metadata?.namaPaket, metadata?.pembuat);
            return sisipkanExifKeWebp(bufferHasil, exif);
          },
          "webp"
        );
      },
      "mp4"
    );
  }

  /**
   * Mengonversi stiker WebP kembali menjadi gambar format PNG.
   */
  public async stikerKeGambar(bufferStiker: Buffer): Promise<Buffer> {
    pencatat.debug("Mengonversi stiker ke gambar PNG");
    return await sharp(bufferStiker).png().toBuffer();
  }

  /**
   * Menghasilkan stiker kutipan percakapan (Quote Chat / QC) sederhana dalam bentuk WebP.
   */
  public async buatStikerKutipan(
    teksKutipan: string,
    namaPengirim: string,
    metadata?: MetadataStiker
  ): Promise<Buffer> {
    const teksAman = teksKutipan
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    const pengirimAman = namaPengirim
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    const svgGelembung = `
      <svg width="512" height="256" viewBox="0 0 512 256" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="none"/>
        <rect x="20" y="20" width="472" height="216" rx="25" ry="25" fill="#202c33"/>
        <text x="50" y="70" font-family="sans-serif" font-size="24" font-weight="bold" fill="#00a884">${pengirimAman}</text>
        <text x="50" y="120" font-family="sans-serif" font-size="20" fill="#e9edef">${teksAman}</text>
      </svg>
    `;

    const svgBuffer = Buffer.from(svgGelembung, "utf-8");
    return await this.gambarKeStiker(svgBuffer, metadata);
  }
}

export const layananStiker = new LayananStiker();
