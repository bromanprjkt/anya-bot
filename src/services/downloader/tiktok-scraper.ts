import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import { buatPencatat } from "../../utils/logger.js";
import type { HasilUnduhan } from "./downloader-adapter.js";

const pencatat = buatPencatat("PengunduhTikTok");

/**
 * Mengambil tautan video TikTok tanpa watermark menggunakan TikWM.
 */
async function unduhViaTikwm(tautan: string): Promise<HasilUnduhan> {
  const respon = await axios.post(
    "https://www.tikwm.com/api/",
    {},
    {
      headers: {
        "Accept": "application/json, text/javascript, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Origin": "https://www.tikwm.com",
        "Referer": "https://www.tikwm.com/",
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36",
      },
      params: { url: tautan, count: 12, cursor: 0, web: 1, hd: 1 },
      timeout: 15000,
    }
  );

  const data = respon.data?.data;
  if (!data) {
    throw new Error("Respon TikWM kosong atau tidak valid.");
  }

  // Jika postingan bertipe album gambar (slideshow)
  if (!data.size && Array.isArray(data.images) && data.images.length > 0) {
    return {
      berhasil: true,
      urlMedia: data.images[0],
      tipeMime: "image/jpeg",
      judul: data.title,
    };
  }

  const urlVideo = data.hdplay
    ? `https://www.tikwm.com${data.hdplay}`
    : data.play
      ? `https://www.tikwm.com${data.play}`
      : undefined;

  if (!urlVideo) {
    throw new Error("Tautan video tidak ditemukan pada respon TikWM.");
  }

  return {
    berhasil: true,
    urlMedia: urlVideo,
    tipeMime: "video/mp4",
    judul: data.title,
  };
}

/**
 * Mengambil tautan video TikTok tanpa watermark menggunakan SSSTik (fallback anti-403).
 */
async function unduhViaSsstik(tautan: string): Promise<HasilUnduhan> {
  const responBeranda = await axios.get("https://ssstik.io/en", {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    timeout: 15000,
  });

  const $ = cheerio.load(responBeranda.data);
  const formulir = $("#submit-form");
  const jalurPost = formulir.attr("hx-post") || "/abc?url=dl";
  const kecocokanToken = responBeranda.data.match(/s_tt\s*=\s*['"]([^'"]+)['"]/);
  const tokenTt = kecocokanToken ? kecocokanToken[1] : "";
  const kuki =
    responBeranda.headers["set-cookie"]?.map((c) => c.split(";")[0]).join("; ") || "";

  const responHasil = await axios.post(
    `https://ssstik.io${jalurPost}`,
    qs.stringify({
      id: tautan,
      locale: "en",
      tt: tokenTt,
    }),
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Origin: "https://ssstik.io",
        Referer: "https://ssstik.io/en",
        Cookie: kuki,
        "HX-Request": "true",
        "HX-Target": "target",
        "HX-Current-URL": "https://ssstik.io/en",
      },
      timeout: 20000,
    }
  );

  const $hasil = cheerio.load(responHasil.data);
  const judul = $hasil(".maintext").text().trim();
  const tautanUnduh =
    $hasil("a.without_watermark").attr("href") ||
    $hasil("a.download_link").attr("href");

  const daftarFoto: string[] = [];
  $hasil(".splide__slide img").each((_, elemen) => {
    const src = $hasil(elemen).attr("src");
    if (src) daftarFoto.push(src);
  });

  if (daftarFoto.length > 0) {
    return {
      berhasil: true,
      urlMedia: daftarFoto[0],
      tipeMime: "image/jpeg",
      judul: judul || "Foto TikTok",
    };
  }

  if (tautanUnduh) {
    const urlLengkap = tautanUnduh.startsWith("http")
      ? tautanUnduh
      : `https://ssstik.io${tautanUnduh}`;

    return {
      berhasil: true,
      urlMedia: urlLengkap,
      tipeMime: "video/mp4",
      judul: judul || "Video TikTok",
    };
  }

  throw new Error("Tautan unduhan tidak ditemukan pada SSSTik.");
}

/**
 * Mengunduh media TikTok dengan dual-engine (TikWM dengan cadangan SSSTik).
 */
export async function unduhVideoTikTok(tautan: string): Promise<HasilUnduhan> {
  try {
    return await unduhViaTikwm(tautan);
  } catch (kesalahanTikwm) {
    pencatat.warn(
      { kesalahan: kesalahanTikwm instanceof Error ? kesalahanTikwm.message : kesalahanTikwm },
      "TikWM gagal atau terblokir, beralih ke mesin cadangan SSSTik"
    );

    try {
      return await unduhViaSsstik(tautan);
    } catch (kesalahanSsstik) {
      const pesanError =
        kesalahanSsstik instanceof Error ? kesalahanSsstik.message : String(kesalahanSsstik);
      pencatat.error({ kesalahan: pesanError }, "Seluruh penyedia unduhan TikTok gagal");

      return {
        berhasil: false,
        pesanKesalahan: "Gagal memproses video TikTok. Pastikan akun atau video tidak diprivat.",
      };
    }
  }
}
