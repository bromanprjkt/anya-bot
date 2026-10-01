import ffmpegStatic from "ffmpeg-static";
import ffmpeg from "fluent-ffmpeg";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { konfigurasiEnv } from "../../../config/env.js";
import { buatPencatat } from "../../../utils/logger.js";

const pencatat = buatPencatat("TranskripAudio");

const jalurFfmpeg =
  typeof ffmpegStatic === "string"
    ? ffmpegStatic
    : ((ffmpegStatic as any)?.default as string) || "";

if (jalurFfmpeg) {
  ffmpeg.setFfmpegPath(jalurFfmpeg);
}

export async function konversiKeWav(bufferAudio: Buffer): Promise<Buffer> {
  const capWaktu = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const jalurMasuk = path.join(os.tmpdir(), `anya_audio_in_${capWaktu}.ogg`);
  const jalurKeluar = path.join(os.tmpdir(), `anya_audio_out_${capWaktu}.wav`);

  try {
    await fs.writeFile(jalurMasuk, bufferAudio);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(jalurMasuk)
        .toFormat("wav")
        .audioChannels(1)
        .audioFrequency(16000)
        .save(jalurKeluar)
        .on("end", () => resolve())
        .on("error", (kesalahan) => reject(kesalahan));
    });

    return await fs.readFile(jalurKeluar);
  } finally {
    await fs.unlink(jalurMasuk).catch(() => {});
    await fs.unlink(jalurKeluar).catch(() => {});
  }
}

export async function transkripsikanPesanSuara(
  bufferAudio: Buffer
): Promise<string> {
  const urlFallback = konfigurasiEnv.aiFallbackBaseUrl;
  const keyFallback = konfigurasiEnv.aiFallbackApiKey;

  if (!urlFallback || !keyFallback) {
    return "";
  }

  const pengontrol = new AbortController();
  const batasWaktu = setTimeout(() => pengontrol.abort(), 20000);

  try {
    const bufferWav = await konversiKeWav(bufferAudio);
    const audioBase64 = bufferWav.toString("base64");

    const endpoint = `${urlFallback.replace(/\/+$/, "")}/chat/completions`;
    const respon = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${keyFallback}`,
      },
      body: JSON.stringify({
        model: "gemini-3.7-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Dengarkan rekaman suara ini dan tuliskan seluruh perkataannya secara akurat ke dalam teks (verbatim). Hanya kembalikan teks hasil pembicaraannya saja tanpa awalan, tanpa akhiran, dan tanpa tanda kutip.",
              },
              {
                type: "input_audio",
                input_audio: {
                  data: audioBase64,
                  format: "wav",
                },
              },
            ],
          },
        ],
      }),
      signal: pengontrol.signal,
    });

    if (!respon.ok) {
      return "";
    }

    const dataJson = (await respon.json()) as any;
    const teksTranskrip = dataJson.choices?.[0]?.message?.content || "";

    return typeof teksTranskrip === "string" ? teksTranskrip.trim() : "";
  } catch (kesalahan) {
    pencatat.warn({ kesalahan }, "Gagal mentranskripsi pesan suara");
    return "";
  } finally {
    clearTimeout(batasWaktu);
  }
}
