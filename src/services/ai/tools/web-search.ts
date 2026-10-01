import * as cheerio from "cheerio";

export interface HasilPencarianWeb {
  judul: string;
  ringkasan: string;
  tautan?: string;
  konten?: string;
}

const HEADER_PERAMBAN = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
};

async function ambilRawReadmeGithub(tautan: string, batasWaktuMs: number): Promise<string> {
  const cocok = tautan.match(
    /^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(?:\/.*)?$/
  );
  if (!cocok) return "";

  const pemilik = cocok[1];
  const repositori = cocok[2]?.replace(/\.git$/, "");
  if (!pemilik || !repositori) return "";

  for (const cabang of ["main", "master"]) {
    const pengontrol = new AbortController();
    const batasWaktu = setTimeout(() => pengontrol.abort(), batasWaktuMs);

    try {
      const endpoint = `https://raw.githubusercontent.com/${pemilik}/${repositori}/${cabang}/README.md`;
      const respon = await fetch(endpoint, {
        headers: HEADER_PERAMBAN,
        signal: pengontrol.signal,
      });

      if (respon.ok) {
        const teks = await respon.text();
        if (teks.trim().length > 50) {
          return teks.trim();
        }
      }
    } catch {
    } finally {
      clearTimeout(batasWaktu);
    }
  }

  return "";
}

function ambilPotonganRelevan(
  teks: string,
  batasKarakter: number,
  kataKunci?: string
): string {
  const teksBersih = teks.trim();
  if (teksBersih.length <= batasKarakter) return teksBersih;

  if (!kataKunci) return teksBersih.slice(0, batasKarakter).trim();

  const kataDaftar = kataKunci
    .toLowerCase()
    .split(/\s+/)
    .filter((k) => k.length > 3);

  let indeksTerbaik = -1;
  for (const kata of kataDaftar) {
    const posisi = teksBersih.toLowerCase().indexOf(kata);
    if (posisi !== -1) {
      if (indeksTerbaik === -1 || posisi < indeksTerbaik) {
        indeksTerbaik = posisi;
      }
    }
  }

  if (indeksTerbaik === -1 || indeksTerbaik < batasKarakter / 2) {
    return teksBersih.slice(0, batasKarakter).trim();
  }

  const panjangAwal = Math.min(1500, Math.floor(batasKarakter * 0.3));
  const awalIntro = teksBersih.slice(0, panjangAwal).trim();
  const sisaBatas = batasKarakter - awalIntro.length - 20;
  const mulaiRelevan = Math.max(0, indeksTerbaik - 200);
  const potonganRelevan = teksBersih
    .slice(mulaiRelevan, mulaiRelevan + sisaBatas)
    .trim();

  return `${awalIntro}\n\n[...]\n\n${potonganRelevan}`;
}

export async function bacaHalamanWeb(
  tautan: string,
  batasKarakter = 7000,
  kataKunci?: string
): Promise<string> {
  if (tautan.includes("github.com")) {
    const readmeRaw = await ambilRawReadmeGithub(tautan, 3500);
    if (readmeRaw) {
      return ambilPotonganRelevan(readmeRaw, batasKarakter, kataKunci);
    }
  }

  const pengontrol = new AbortController();
  const batasWaktu = setTimeout(() => pengontrol.abort(), 4500);

  try {
    const respon = await fetch(tautan, {
      headers: HEADER_PERAMBAN,
      signal: pengontrol.signal,
    });

    if (!respon.ok) return "";

    const teksHtml = await respon.text();
    const $ = cheerio.load(teksHtml);
    $("script, style, nav, footer, header, aside, .sidebar, .ads, .menu, noscript, iframe").remove();

    let target = $("article.markdown-body, #readme, article, main, .content, #content").first();
    if (target.length === 0) {
      target = $("body");
    }

    const daftarBaris: string[] = [];
    target.find("h1, h2, h3, h4, h5, p, li, pre, code").each((_, elemen) => {
      const teks = $(elemen).text().trim();
      const bersih = teks.replace(/[\t ]+/g, " ").replace(/\n{2,}/g, "\n").trim();
      if (bersih.length > 5 && !daftarBaris.includes(bersih)) {
        daftarBaris.push(bersih);
      }
    });

    let hasilGabung = daftarBaris.join("\n");
    if (hasilGabung.trim().length < 50) {
      hasilGabung = $("body").text().replace(/\s+/g, " ").trim();
    }

    return ambilPotonganRelevan(hasilGabung, batasKarakter, kataKunci);
  } catch {
    return "";
  } finally {
    clearTimeout(batasWaktu);
  }
}

async function cariDuckDuckGoHtml(kueri: string, batas: number): Promise<HasilPencarianWeb[]> {
  const pengontrol = new AbortController();
  const batasWaktu = setTimeout(() => pengontrol.abort(), 6000);

  try {
    const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(kueri)}&kl=id-id`;
    const respon = await fetch(endpoint, {
      headers: HEADER_PERAMBAN,
      signal: pengontrol.signal,
    });

    if (!respon.ok) return [];

    const teksHtml = await respon.text();
    const $ = cheerio.load(teksHtml);
    const daftarHasil: HasilPencarianWeb[] = [];

    $(".result__body").each((indeks, elemen) => {
      if (indeks >= batas) return;
      const judul = $(elemen).find(".result__title").text().replace(/\s+/g, " ").trim();
      const ringkasan = $(elemen).find(".result__snippet").text().replace(/\s+/g, " ").trim();
      let tautan = $(elemen).find(".result__url").text().trim();
      if (tautan && !tautan.startsWith("http")) {
        tautan = `https://${tautan.replace(/^https?:\/\//, "")}`;
      }

      if (judul && ringkasan) {
        daftarHasil.push({
          judul,
          ringkasan,
          tautan: tautan || undefined,
        });
      }
    });

    return daftarHasil;
  } catch {
    return [];
  } finally {
    clearTimeout(batasWaktu);
  }
}

async function cariDuckDuckGoLite(kueri: string, batas: number): Promise<HasilPencarianWeb[]> {
  const pengontrol = new AbortController();
  const batasWaktu = setTimeout(() => pengontrol.abort(), 6000);

  try {
    const endpoint = "https://lite.duckduckgo.com/lite/";
    const respon = await fetch(endpoint, {
      method: "POST",
      headers: {
        ...HEADER_PERAMBAN,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `q=${encodeURIComponent(kueri)}&kl=id-id`,
      signal: pengontrol.signal,
    });

    if (!respon.ok) return [];

    const teksHtml = await respon.text();
    const $ = cheerio.load(teksHtml);
    const daftarHasil: HasilPencarianWeb[] = [];

    $(".result-link").each((indeks, elemen) => {
      if (indeks >= batas) return;
      const judul = $(elemen).text().replace(/\s+/g, " ").trim();
      const barisRingkasan = $(elemen).closest("tr").next();
      const ringkasan = barisRingkasan.find(".result-snippet").text().replace(/\s+/g, " ").trim();
      const tautanMentah = $(elemen).attr("href") ?? "";

      if (judul && ringkasan) {
        daftarHasil.push({
          judul,
          ringkasan,
          tautan: tautanMentah || undefined,
        });
      }
    });

    return daftarHasil;
  } catch {
    return [];
  } finally {
    clearTimeout(batasWaktu);
  }
}

async function cariDuckDuckGoApi(kueri: string): Promise<HasilPencarianWeb[]> {
  const pengontrol = new AbortController();
  const batasWaktu = setTimeout(() => pengontrol.abort(), 4000);

  try {
    const endpoint = `https://api.duckduckgo.com/?q=${encodeURIComponent(kueri)}&format=json&no_html=1&skip_disambig=1`;
    const respon = await fetch(endpoint, {
      headers: HEADER_PERAMBAN,
      signal: pengontrol.signal,
    });

    if (!respon.ok) return [];

    const data = (await respon.json()) as any;
    const daftarHasil: HasilPencarianWeb[] = [];

    if (data.Heading && data.AbstractText) {
      daftarHasil.push({
        judul: String(data.Heading),
        ringkasan: String(data.AbstractText),
        tautan: data.AbstractURL || undefined,
      });
    }

    if (Array.isArray(data.RelatedTopics)) {
      for (const topik of data.RelatedTopics.slice(0, 3)) {
        if (topik.Text && topik.FirstURL) {
          daftarHasil.push({
            judul: String(topik.Text).slice(0, 60),
            ringkasan: String(topik.Text),
            tautan: topik.FirstURL,
          });
        }
      }
    }

    return daftarHasil;
  } catch {
    return [];
  } finally {
    clearTimeout(batasWaktu);
  }
}

async function cariWikipedia(kueri: string, batas: number): Promise<HasilPencarianWeb[]> {
  const pengontrol = new AbortController();
  const batasWaktu = setTimeout(() => pengontrol.abort(), 5000);

  try {
    const endpoint = `https://id.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(kueri)}&format=json&utf8=1&srlimit=${batas}`;
    const respon = await fetch(endpoint, {
      headers: { "User-Agent": "AnyaBot/0.1" },
      signal: pengontrol.signal,
    });

    if (!respon.ok) return [];

    const data = (await respon.json()) as any;
    const item = data?.query?.search;
    if (!Array.isArray(item)) return [];

    return item.map((i: any) => ({
      judul: String(i.title ?? ""),
      ringkasan: String(i.snippet ?? "").replace(/<[^>]+>/g, ""),
      tautan: `https://id.wikipedia.org/wiki/${encodeURIComponent(String(i.title ?? ""))}`,
    }));
  } catch {
    return [];
  } finally {
    clearTimeout(batasWaktu);
  }
}

export async function cariWeb(kueri: string, batas = 4): Promise<HasilPencarianWeb[]> {
  const kueriBersih = kueri.replace(/["'\r\n]/g, " ").trim();
  if (!kueriBersih) return [];

  let hasil = await cariDuckDuckGoHtml(kueriBersih, batas);

  if (hasil.length === 0) {
    hasil = await cariDuckDuckGoLite(kueriBersih, batas);
  }

  if (hasil.length === 0) {
    hasil = await cariDuckDuckGoApi(kueriBersih);
  }

  if (hasil.length === 0) {
    hasil = await cariWikipedia(kueriBersih, batas);
  }

  if (hasil.length > 0) {
    await Promise.allSettled(
      hasil.slice(0, 2).map(async (item) => {
        if (item.tautan && item.tautan.startsWith("http")) {
          const kontenHalaman = await bacaHalamanWeb(item.tautan, 7000, kueriBersih);
          if (kontenHalaman) {
            item.konten = kontenHalaman;
          }
        }
      })
    );
  }

  return hasil;
}
