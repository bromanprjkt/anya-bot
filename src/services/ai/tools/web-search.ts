import * as cheerio from "cheerio";

export interface HasilPencarianWeb {
  judul: string;
  ringkasan: string;
  tautan?: string;
}

const HEADER_PERAMBAN = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
};

async function cariDuckDuckGoHtml(kueri: string, batas: number): Promise<HasilPencarianWeb[]> {
  const pengontrol = new AbortController();
  const batasWaktu = setTimeout(() => pengontrol.abort(), 6000);

  try {
    const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(kueri)}`;
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
      const judul = $(elemen).find(".result__title").text().trim();
      const ringkasan = $(elemen).find(".result__snippet").text().trim();
      const tautan = $(elemen).find(".result__url").text().trim();

      if (judul && ringkasan) {
        daftarHasil.push({
          judul,
          ringkasan,
          tautan: tautan ? `https://${tautan.replace(/^https?:\/\//, "")}` : undefined,
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
      body: `q=${encodeURIComponent(kueri)}`,
      signal: pengontrol.signal,
    });

    if (!respon.ok) return [];

    const teksHtml = await respon.text();
    const $ = cheerio.load(teksHtml);
    const daftarHasil: HasilPencarianWeb[] = [];

    $(".result-link").each((indeks, elemen) => {
      if (indeks >= batas) return;
      const judul = $(elemen).text().trim();
      const barisRingkasan = $(elemen).closest("tr").next();
      const ringkasan = barisRingkasan.find(".result-snippet").text().trim();
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
  const kueriBersih = kueri.trim();
  if (!kueriBersih) return [];

  const hasilHtml = await cariDuckDuckGoHtml(kueriBersih, batas);
  if (hasilHtml.length > 0) return hasilHtml;

  const hasilLite = await cariDuckDuckGoLite(kueriBersih, batas);
  if (hasilLite.length > 0) return hasilLite;

  const hasilWiki = await cariWikipedia(kueriBersih, batas);
  return hasilWiki;
}
