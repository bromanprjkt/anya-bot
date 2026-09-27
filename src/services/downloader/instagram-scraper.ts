import axios from "axios";
import * as cheerio from "cheerio";
import qs from "qs";
import { buatPencatat } from "../../utils/logger.js";
import type { HasilUnduhan } from "./downloader-adapter.js";

const pencatat = buatPencatat("PengunduhInstagram");

const TAJUK_GRAPHQL = {
  Accept: "*/*",
  "Accept-Language": "en-US,en;q=0.5",
  "Content-Type": "application/x-www-form-urlencoded",
  "X-FB-Friendly-Name": "PolarisPostActionLoadPostQueryQuery",
  "X-CSRFToken": "RVDUooU5MYsBbS1CNN3CzVAuEP8oHB52",
  "X-IG-App-ID": "1217981644879628",
  "X-FB-LSD": "AVqbxe3J_YA",
  "X-ASBD-ID": "129477",
  "Sec-Fetch-Dest": "empty",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Site": "same-origin",
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 11; SAMSUNG SM-G973U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/14.2 Chrome/87.0.4280.141 Mobile Safari/537.36",
};

function ambilIdPostInstagram(tautan: string): string | null {
  const polaRegex =
    /(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|tv|stories|reel)\/([^/?#&]+).*/;
  const hasilCocok = tautan.match(polaRegex);
  return hasilCocok && hasilCocok[1] ? hasilCocok[1] : null;
}

function enkripsiDataPermintaanGraphql(kodePendek: string): string {
  const dataPermintaan = {
    av: "0",
    __d: "www",
    __user: "0",
    __a: "1",
    __req: "3",
    __hs: "19624.HYP:instagram_web_pkg.2.1..0.0",
    dpr: "3",
    __ccg: "UNKNOWN",
    __rev: "1008824440",
    __s: "xf44ne:zhh75g:xr51e7",
    __hsi: "7282217488877343271",
    __dyn:
      "7xeUmwlEnwn8K2WnFw9-2i5U4e0yoW3q32360CEbo1nEhw2nVE4W0om78b87C0yE5ufz81s8hwGwQwoEcE7O2l0Fwqo31w9a9x-0z8-U2zxe2GewGwso88cobEaU2eUlwhEe87q7-0iK2S3qazo7u1xwIw8O321LwTwKG1pg661pwr86C1mwraCg",
    __csr:
      "gZ3yFmJkillQvV6ybimnG8AmhqujGbLADgjyEOWz49z9XDlAXBJpC7Wy-vQTSvUGWGh5u8KibG44dBiigrgjDxGjU0150Q0848azk48N09C02IR0go4SaR70r8owyg9pU0V23hwiA0LQczA48S0f-x-27o05NG0fkw",
    __comet_req: "7",
    lsd: "AVqbxe3J_YA",
    jazoest: "2957",
    __spin_r: "1008824440",
    __spin_b: "trunk",
    __spin_t: "1695523385",
    fb_api_caller_class: "RelayModern",
    fb_api_req_friendly_name: "PolarisPostActionLoadPostQueryQuery",
    variables: JSON.stringify({
      shortcode: kodePendek,
      fetch_comment_count: null,
      fetch_related_profile_media_count: null,
      parent_comment_count: null,
      child_comment_count: null,
      fetch_like_count: null,
      fetch_tagged_user_count: null,
      fetch_preview_comment_count: null,
      has_threaded_comments: false,
      hoisted_comment_id: null,
      hoisted_reply_id: null,
    }),
    server_timestamps: "true",
    doc_id: "10015901848480474",
  };

  return qs.stringify(dataPermintaan);
}

async function unduhViaGraphql(tautan: string): Promise<HasilUnduhan> {
  const idPost = ambilIdPostInstagram(tautan);
  if (!idPost) {
    throw new Error("ID postingan Instagram tidak valid.");
  }

  const dataTerkode = enkripsiDataPermintaanGraphql(idPost);
  const respon = await axios.post("https://www.instagram.com/api/graphql", dataTerkode, {
    headers: TAJUK_GRAPHQL,
    timeout: 20000,
  });

  const mediaData = respon.data?.data?.xdt_shortcode_media;
  if (!mediaData) {
    throw new Error("Media GraphQL Instagram tidak ditemukan.");
  }

  const adalahVideo = Boolean(mediaData.is_video);
  let urlMedia: string | undefined;

  if (mediaData.edge_sidecar_to_children?.edges?.length > 0) {
    const nodePertama = mediaData.edge_sidecar_to_children.edges[0]?.node;
    urlMedia = nodePertama?.video_url || nodePertama?.display_url;
  } else {
    urlMedia = mediaData.video_url || mediaData.display_url;
  }

  if (!urlMedia) {
    throw new Error("Tautan media Instagram kosong.");
  }

  const takarir = mediaData.edge_media_to_caption?.edges?.[0]?.node?.text ?? undefined;

  return {
    berhasil: true,
    urlMedia,
    tipeMime: adalahVideo ? "video/mp4" : "image/jpeg",
    judul: takarir,
  };
}

function dekodeDataSnapSave(dataLarik: string[]): string {
  const bagian1 = dataLarik[0];
  const bagian3 = dataLarik[2];
  const bagian4Str = dataLarik[3];
  const bagian5Str = dataLarik[4];

  if (!bagian1 || !bagian3 || !bagian4Str || !bagian5Str) {
    return "";
  }

  const bagian4 = parseInt(bagian4Str, 10);
  const bagian5 = parseInt(bagian5Str, 10);
  const karakterAcuan = bagian3[bagian5] ?? "";

  function dekodeSegmen(segmen: string, basis: number, panjang: number): string {
    const kumpulanKarakter =
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ+/".split("");
    const basisKumpulan = kumpulanKarakter.slice(0, basis);
    const kumpulanDekode = kumpulanKarakter.slice(0, panjang);

    let nilaiDekode = segmen
      .split("")
      .reverse()
      .reduce((akumulator: number, karakter: string, indeks: number) => {
        if (basisKumpulan.indexOf(karakter) !== -1) {
          return akumulator + basisKumpulan.indexOf(karakter) * Math.pow(basis, indeks);
        }
        return akumulator;
      }, 0);

    let hasil = "";
    while (nilaiDekode > 0) {
      hasil = (kumpulanDekode[nilaiDekode % panjang] ?? "") + hasil;
      nilaiDekode = Math.floor(nilaiDekode / panjang);
    }

    return hasil || "0";
  }

  let hasilString = "";
  for (let i = 0; i < bagian1.length; i++) {
    let segmen = "";
    while (i < bagian1.length && bagian1[i] !== karakterAcuan) {
      segmen += bagian1[i];
      i++;
    }

    for (let j = 0; j < bagian3.length; j++) {
      const karakterPola = bagian3[j];
      if (karakterPola) {
        segmen = segmen.replace(new RegExp(karakterPola, "g"), j.toString());
      }
    }
    hasilString += String.fromCharCode(
      Number(dekodeSegmen(segmen, bagian5, 10)) - bagian4
    );
  }

  return decodeURIComponent(encodeURIComponent(hasilString));
}

async function unduhViaSnapSave(tautan: string): Promise<HasilUnduhan> {
  const respon = await axios.post(
    "https://snapsave.app/action.php?lang=id",
    `url=${encodeURIComponent(tautan)}`,
    {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://snapsave.app",
        referer: "https://snapsave.app/id",
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      timeout: 20000,
    }
  );

  const teksHtml = respon.data as string;
  const kecocokanParams = teksHtml.split("decodeURIComponent(escape(r))}(")[1]?.split("))")[0];
  if (!kecocokanParams) {
    throw new Error("Gagal mengurai respon enkripsi SnapSave.");
  }

  const larikParams = kecocokanParams
    .split(",")
    .map((item) => item.replace(/"/g, "").trim());

  const htmlDekode = dekodeDataSnapSave(larikParams);
  const potonganHtml = htmlDekode
    .split('getElementById("download-section").innerHTML = "')[1]
    ?.split('"; document.getElementById("inputData").remove(); ')[0]
    ?.replace(/\\(\\)?/g, "");

  if (!potonganHtml) {
    throw new Error("Gagal mengambil bagian unduhan SnapSave.");
  }

  const $ = cheerio.load(potonganHtml);
  const daftarTautanUnduh: string[] = [];

  $("div.download-items__btn a").each((_, elemen) => {
    let tautanHref = $(elemen).attr("href");
    if (tautanHref) {
      if (!/https?:\/\//.test(tautanHref)) {
        tautanHref = `https://snapsave.app${tautanHref}`;
      }
      daftarTautanUnduh.push(tautanHref);
    }
  });

  const urlMedia = daftarTautanUnduh[0];
  if (!urlMedia) {
    throw new Error("Tidak ada tautan media yang ditemukan dari SnapSave.");
  }

  const adalahVideo = urlMedia.includes(".mp4") || urlMedia.includes("video");

  return {
    berhasil: true,
    urlMedia,
    tipeMime: adalahVideo ? "video/mp4" : "image/jpeg",
  };
}

export async function unduhMediaInstagram(tautan: string): Promise<HasilUnduhan> {
  try {
    return await unduhViaGraphql(tautan);
  } catch (kesalahanGraphql) {
    pencatat.warn(
      { kesalahan: kesalahanGraphql instanceof Error ? kesalahanGraphql.message : kesalahanGraphql },
      "GraphQL Instagram gagal, mencoba mesin cadangan SnapSave"
    );

    try {
      return await unduhViaSnapSave(tautan);
    } catch (kesalahanSnapSave) {
      const pesanError =
        kesalahanSnapSave instanceof Error ? kesalahanSnapSave.message : String(kesalahanSnapSave);
      pencatat.error({ kesalahan: pesanError }, "Seluruh penyedia unduhan Instagram gagal");

      return {
        berhasil: false,
        pesanKesalahan: "Gagal memproses media Instagram. Pastikan akun tidak diprivat.",
      };
    }
  }
}
