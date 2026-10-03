import sharp from "sharp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import fs from "node:fs/promises";
import { buatPencatat } from "../../utils/logger.js";
import { layananPenyimpananSementara } from "../storage/temp-storage.js";
import { DATA_FONT_NARROW } from "../../assets/fonts/font-narrow.js";

const pencatat = buatPencatat("LayananStiker");

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic as unknown as string);
}

export interface MetadataStiker {
  namaPaket?: string;
  pembuat?: string;
}

function buatBufferExif(namaPaket: string = "Anya Bot", pembuat: string = "github@bromanprjkt"): Buffer {
  const jsonMetadata = {
    "sticker-pack-id": "anya-bot-pack",
    "sticker-pack-name": namaPaket,
    "sticker-pack-publisher": pembuat,
    emojis: [],
  };

  const stringJson = JSON.stringify(jsonMetadata);
  const panjangJson = Buffer.byteLength(stringJson, "utf8");
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

  const kumpulanChunk: Buffer[] = [];
  let posisi = 12;
  let adaVp8x = false;

  while (posisi < bufferWebp.length) {
    if (posisi + 8 > bufferWebp.length) break;
    const fourCC = bufferWebp.toString("ascii", posisi, posisi + 4);
    const ukuranChunk = bufferWebp.readUInt32LE(posisi + 4);
    const panjangTotalChunk = 8 + ukuranChunk + (ukuranChunk % 2);

    if (fourCC === "VP8X") {
      adaVp8x = true;
    }

    if (fourCC !== "EXIF") {
      kumpulanChunk.push(
        bufferWebp.subarray(posisi, Math.min(posisi + panjangTotalChunk, bufferWebp.length))
      );
    }
    posisi += panjangTotalChunk;
  }

  const panjangExif = bufferExif.length;
  const chunkExif = Buffer.alloc(8 + panjangExif + (panjangExif % 2));
  chunkExif.write("EXIF", 0, 4, "ascii");
  chunkExif.writeUInt32LE(panjangExif, 4);
  bufferExif.copy(chunkExif, 8);
  kumpulanChunk.push(chunkExif);

  const tajukRiff = Buffer.alloc(12);
  tajukRiff.write("RIFF", 0, 4, "ascii");
  tajukRiff.write("WEBP", 8, 4, "ascii");

  let badan = Buffer.concat(kumpulanChunk);

  if (adaVp8x) {
    badan[8] = (badan[8] ?? 0) | 0x08;
  } else {
    const chunkVp8x = Buffer.alloc(18);
    chunkVp8x.write("VP8X", 0, 4, "ascii");
    chunkVp8x.writeUInt32LE(10, 4);
    chunkVp8x[8] = 0x08;
    const l = lebar - 1;
    chunkVp8x[12] = l & 0xff;
    chunkVp8x[13] = (l >> 8) & 0xff;
    chunkVp8x[14] = (l >> 16) & 0xff;
    const t = tinggi - 1;
    chunkVp8x[15] = t & 0xff;
    chunkVp8x[16] = (t >> 8) & 0xff;
    chunkVp8x[17] = (t >> 16) & 0xff;
    badan = Buffer.concat([chunkVp8x, badan]);
  }

  const hasilAkhir = Buffer.concat([tajukRiff, badan]);
  hasilAkhir.writeUInt32LE(hasilAkhir.length - 8, 4);
  return hasilAkhir;
}


export class LayananStiker {
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
            const jalankanKonversi = async (
              durasiDetik: number,
              fps: number,
              kualitas: number,
              batasUkuranKb: number
            ): Promise<void> => {
              const detikTeks = String(durasiDetik).padStart(2, "0");
              await new Promise<void>((selesai, tolak) => {
                ffmpeg(jalurInput)
                  .inputOptions([`-t ${durasiDetik}`])
                  .outputOptions([
                    "-vcodec libwebp",
                    `-vf scale=512:512:force_original_aspect_ratio=decrease,fps=${fps},pad=512:512:(ow-iw)/2:(oh-ih)/2:color=white@0.0`,
                    "-loop 0",
                    "-ss 00:00:00",
                    `-t 00:00:${detikTeks}`,
                    "-preset default",
                    "-an",
                    "-vsync 0",
                    "-s 512:512",
                    `-quality ${kualitas}`,
                    `-fs ${batasUkuranKb}k`,
                  ])
                  .toFormat("webp")
                  .save(jalurOutput)
                  .on("end", () => selesai())
                  .on("error", (err) => tolak(err));
              });
            };

            await jalankanKonversi(10, 10, 40, 460);

            let bufferHasil = await fs.readFile(jalurOutput);

            if (bufferHasil.length > 470 * 1024) {
              pencatat.warn("Ukuran stiker animasi melebihi batas aman, melakukan kompresi ulang");
              await jalankanKonversi(7, 8, 30, 420);
              bufferHasil = await fs.readFile(jalurOutput);
            }

            const exif = buatBufferExif(metadata?.namaPaket, metadata?.pembuat);
            return sisipkanExifKeWebp(bufferHasil, exif);
          },
          "webp"
        );
      },
      "mp4"
    );
  }

  public async stikerKeGambar(bufferStiker: Buffer): Promise<Buffer> {
    pencatat.debug("Mengonversi stiker ke gambar PNG");
    return await sharp(bufferStiker).png().toBuffer();
  }

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

  public async buatStikerTeks(
    teks: string,
    metadata?: MetadataStiker
  ): Promise<Buffer> {
    const barisMentah = teks.split(/\r?\n/);
    const daftarBaris: string[] = [];
    const batasKarakter = 12;

    for (const baris of barisMentah) {
      const barisTrim = baris.trimEnd();
      if (!barisTrim) {
        if (daftarBaris.length > 0) daftarBaris.push("");
        continue;
      }

      if (barisTrim.includes("  ")) {
        daftarBaris.push(barisTrim);
        continue;
      }

      const kataLarik = barisTrim.split(" ");
      let barisSaatIni = "";
      for (const kata of kataLarik) {
        if (!kata) continue;
        if (!barisSaatIni) {
          barisSaatIni = kata;
        } else if ((barisSaatIni + " " + kata).length <= batasKarakter) {
          barisSaatIni += " " + kata;
        } else {
          daftarBaris.push(barisSaatIni);
          barisSaatIni = kata;
        }
      }
      if (barisSaatIni) {
        daftarBaris.push(barisSaatIni);
      }
    }

    const barisFinal = daftarBaris.length > 0 ? daftarBaris : [teks];
    const jumlahBaris = barisFinal.length;
    let ukuranFont = 84;

    if (jumlahBaris === 1) {
      ukuranFont = 100;
    } else if (jumlahBaris === 2) {
      ukuranFont = 94;
    } else if (jumlahBaris === 3) {
      ukuranFont = 84;
    } else if (jumlahBaris === 4) {
      ukuranFont = 78;
    } else if (jumlahBaris === 5) {
      ukuranFont = 66;
    } else if (jumlahBaris === 6) {
      ukuranFont = 56;
    } else {
      ukuranFont = Math.max(28, Math.floor(360 / jumlahBaris));
    }

    const lebarEfektifMaks = Math.max(
      ...barisFinal.map((b) => hitungLebarKarakterEfektif(b)),
      1
    );
    if (lebarEfektifMaks * ukuranFont > 420) {
      ukuranFont = Math.floor(420 / lebarEfektifMaks);
    }
    ukuranFont = Math.max(24, ukuranFont);

    const jarakBaris = Math.round(ukuranFont * 1.15);
    const totalTinggi = (jumlahBaris - 1) * jarakBaris + Math.round(ukuranFont * 0.8);
    const yAwal = Math.round((512 - totalTinggi) / 2 + ukuranFont * 0.78);
    const posisiX = 40;

    const tspans = barisFinal
      .map((b, i) => {
        const teksAman = sanitasiSvg(b);
        return `<text x="${posisiX}" y="${yAwal + i * jarakBaris}" xml:space="preserve" font-family="NarrowFont, Liberation Sans Narrow, Arial Narrow, sans-serif" font-size="${ukuranFont}" fill="#000000">${teksAman}</text>`;
      })
      .join("\n");

    const svgTeks = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <style>
            @font-face {
              font-family: "NarrowFont";
              src: url("${DATA_FONT_NARROW}") format("truetype");
            }
          </style>
        </defs>
        <rect width="512" height="512" fill="#ffffff"/>
        ${tspans}
      </svg>
    `;

    const svgBuffer = Buffer.from(svgTeks, "utf-8");
    return await this.gambarKeStiker(svgBuffer, metadata);
  }

  public async buatStikerMeme(
    bufferGambar: Buffer,
    teksAtas: string,
    teksBawah: string,
    metadata?: MetadataStiker
  ): Promise<Buffer> {
    pencatat.debug("Membuat stiker meme dari gambar");

    const metadataInput = await sharp(bufferGambar).metadata();
    const lebarAsli = metadataInput.width ?? 512;
    const tinggiAsli = metadataInput.height ?? 512;

    const rasio = lebarAsli / tinggiAsli;
    let lebarGambar = 512;
    let tinggiGambar = 512;
    let offsetY = 0;

    if (rasio >= 1) {
      tinggiGambar = Math.round(512 / rasio);
      offsetY = Math.round((512 - tinggiGambar) / 2);
    } else {
      lebarGambar = Math.round(512 * rasio);
    }

    const barisAtas = pisahDanBungkusBaris(teksAtas);
    const barisBawah = pisahDanBungkusBaris(teksBawah);

    const panjangMaksimal = Math.max(
      ...barisAtas.map((b) => b.length),
      ...barisBawah.map((b) => b.length),
      0
    );

    let ukuranFont = 40;
    if (panjangMaksimal > 22 || barisAtas.length + barisBawah.length > 4) {
      ukuranFont = 28;
    } else if (panjangMaksimal > 16 || barisAtas.length + barisBawah.length > 2) {
      ukuranFont = 34;
    }

    if (lebarGambar < 350) {
      ukuranFont = Math.min(ukuranFont, Math.round(lebarGambar / 10));
    }

    const jarakBaris = Math.round(ukuranFont * 1.15);
    const ketebalanGaris = Math.max(2, Math.round(ukuranFont * 0.08));

    const posAtas = barisAtas.map(
      (_, i) => offsetY + Math.round(ukuranFont * 1.05) + i * jarakBaris
    );
    const yBawahAkhir = offsetY + tinggiGambar - Math.round(ukuranFont * 0.35);
    const posBawah = barisBawah.map(
      (_, i) => yBawahAkhir - (barisBawah.length - 1 - i) * jarakBaris
    );

    const teksAtasSvg = barisAtas
      .map((baris, i) => {
        const teksAman = sanitasiSvg(baris.toUpperCase());
        return `<text x="256" y="${posAtas[i]}" class="meme-teks" font-size="${ukuranFont}">${teksAman}</text>`;
      })
      .join("\n");

    const teksBawahSvg = barisBawah
      .map((baris, i) => {
        const teksAman = sanitasiSvg(baris.toUpperCase());
        return `<text x="256" y="${posBawah[i]}" class="meme-teks" font-size="${ukuranFont}">${teksAman}</text>`;
      })
      .join("\n");

    const svgMeme = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <style>
          .meme-teks {
            font-family: Impact, "Arial Black", "Trebuchet MS", sans-serif;
            font-weight: 900;
            fill: #ffffff;
            stroke: #000000;
            stroke-width: ${ketebalanGaris}px;
            paint-order: stroke fill;
            stroke-linejoin: round;
            text-anchor: middle;
          }
        </style>
        ${teksAtasSvg}
        ${teksBawahSvg}
      </svg>
    `;

    const webpBuffer = await sharp(bufferGambar)
      .resize(512, 512, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .composite([{ input: Buffer.from(svgMeme, "utf-8"), top: 0, left: 0 }])
      .webp({ quality: 80 })
      .toBuffer();

    const exif = buatBufferExif(metadata?.namaPaket, metadata?.pembuat);
    return sisipkanExifKeWebp(webpBuffer, exif);
  }
}

function sanitasiSvg(teks: string): string {
  return teks
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function hitungLebarKarakterEfektif(teks: string): number {
  let lebar = 0;
  for (const c of teks) {
    if (c === " ") {
      lebar += 0.24;
    } else if (c === c.toUpperCase() && c !== c.toLowerCase()) {
      lebar += 0.52;
    } else {
      lebar += 0.44;
    }
  }
  return lebar;
}

function bungkusTeksMeme(teks: string, batasKarakter: number = 22): string[] {
  if (!teks.trim()) return [];
  const kataLarik = teks.trim().split(/\s+/);
  const daftarBaris: string[] = [];
  let barisSaatIni = "";

  for (const kata of kataLarik) {
    if (!kata) continue;
    if (!barisSaatIni) {
      barisSaatIni = kata;
    } else if ((barisSaatIni + " " + kata).length <= batasKarakter) {
      barisSaatIni += " " + kata;
    } else {
      daftarBaris.push(barisSaatIni);
      barisSaatIni = kata;
    }
  }
  if (barisSaatIni) {
    daftarBaris.push(barisSaatIni);
  }
  return daftarBaris;
}

function pisahDanBungkusBaris(teks: string, batasKarakter: number = 22): string[] {
  const barisMentah = teks.split(/\r?\n/).map((b) => b.trim()).filter(Boolean);
  const hasil: string[] = [];
  for (const baris of barisMentah) {
    hasil.push(...bungkusTeksMeme(baris, batasKarakter));
  }
  return hasil;
}

export const layananStiker = new LayananStiker();
