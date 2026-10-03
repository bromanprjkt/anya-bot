import type { WASocket } from "@whiskeysockets/baileys";
import { konfigurasiEnv, type KonfigurasiEnv } from "../../config/env.js";
import { buatPencatat } from "../../utils/logger.js";
import { cariWeb, bacaHalamanWeb } from "./tools/web-search.js";
import { repositoriMemoriAi } from "../../repositories/ai-memory-repository.js";
import { antreanAi, type TingkatPrioritasAi } from "../queue/ai-queue.js";

const pencatat = buatPencatat("LayananAi");

export interface PanggilanAlatAi {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface BagianKontenTeks {
  type: "text";
  text: string;
}

export interface BagianKontenGambar {
  type: "image_url";
  image_url: {
    url: string;
  };
}

export type KontenPesanAi = string | (BagianKontenTeks | BagianKontenGambar)[];

export interface PesanAi {
  role: "system" | "user" | "assistant" | "tool";
  content?: KontenPesanAi | null;
  tool_calls?: PanggilanAlatAi[];
  tool_call_id?: string;
}

export interface OpsiKonteksObrolan {
  adalahGrup?: boolean;
  idPengguna?: string;
  gambarBase64?: string[];
  adalahPemilik?: boolean;
  prioritas?: TingkatPrioritasAi;
  soket?: WASocket;
}

interface EntriPanggilanTerurai {
  nama: string;
  kueri?: string;
  url?: string;
  fakta?: string;
  kategori?: string;
  id?: string;
}

interface KonteksPenggunaAi {
  idPenggunaUnik?: string;
  namaPengguna?: string;
}

function lepaskanKarakterRegExp(teks: string): string {
  return teks.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function ekstrakPanggilanAlat(pesanPilihan: any): EntriPanggilanTerurai | null {
  if (Array.isArray(pesanPilihan?.tool_calls) && pesanPilihan.tool_calls.length > 0) {
    const p = pesanPilihan.tool_calls[0];
    if (p?.function?.name === "cari_web") {
      try {
        const argumen = JSON.parse(p.function.arguments || "{}");
        const kueri = argumen.kueri || argumen.query || "";
        if (kueri) {
          return { nama: "cari_web", kueri: String(kueri).trim(), id: p.id };
        }
      } catch {}
    }
    if (p?.function?.name === "baca_web") {
      try {
        const argumen = JSON.parse(p.function.arguments || "{}");
        const url = argumen.url || argumen.tautan || "";
        if (url) {
          return { nama: "baca_web", url: String(url).trim(), id: p.id };
        }
      } catch {}
    }
    if (p?.function?.name === "ingat_fakta") {
      try {
        const argumen = JSON.parse(p.function.arguments || "{}");
        const fakta = argumen.fakta || "";
        const kategori = argumen.kategori || "umum";
        if (fakta) {
          return {
            nama: "ingat_fakta",
            fakta: String(fakta).trim(),
            kategori: String(kategori).trim(),
            id: p.id,
          };
        }
      } catch {}
    }
  }

  const teks = typeof pesanPilihan?.content === "string" ? pesanPilihan.content : "";
  if (!teks) return null;

  const dsmlCocok = teks.match(
    /<｜DSML｜\s*invoke\s+name=["']([^"']+)["']>([\s\S]*?)<\/｜DSML｜\s*invoke>/i
  );
  if (dsmlCocok) {
    const nama = dsmlCocok[1];
    const isi = dsmlCocok[2];
    const paramKueri = isi.match(
      /<｜DSML｜\s*parameter\s+name=["'](?:kueri|query)["'][^>]*>([\s\S]*?)<\/｜DSML｜\s*parameter>/i
    );
    const paramUrl = isi.match(
      /<｜DSML｜\s*parameter\s+name=["'](?:url|tautan)["'][^>]*>([\s\S]*?)<\/｜DSML｜\s*parameter>/i
    );
    const paramFakta = isi.match(
      /<｜DSML｜\s*parameter\s+name=["']fakta["'][^>]*>([\s\S]*?)<\/｜DSML｜\s*parameter>/i
    );
    const paramKategori = isi.match(
      /<｜DSML｜\s*parameter\s+name=["']kategori["'][^>]*>([\s\S]*?)<\/｜DSML｜\s*parameter>/i
    );

    if (nama === "cari_web" && paramKueri) {
      return { nama, kueri: paramKueri[1].trim() };
    }
    if (nama === "baca_web" && paramUrl) {
      return { nama, url: paramUrl[1].trim() };
    }
    if (nama === "ingat_fakta" && paramFakta) {
      return {
        nama,
        fakta: paramFakta[1].trim(),
        kategori: paramKategori ? paramKategori[1].trim() : "umum",
      };
    }
  }

  const toolCallCocok = teks.match(/<tool_call>([\s\S]*?)<\/tool_call>/i);
  if (toolCallCocok) {
    try {
      const data = JSON.parse(toolCallCocok[1].trim());
      const nama = data.name || (data.arguments?.url ? "baca_web" : data.arguments?.fakta ? "ingat_fakta" : "cari_web");
      const kueri = data.arguments?.kueri || data.arguments?.query || data.kueri || data.query || "";
      const url = data.arguments?.url || data.arguments?.tautan || data.url || data.tautan || "";
      const fakta = data.arguments?.fakta || data.fakta || "";
      const kategori = data.arguments?.kategori || data.kategori || "umum";

      if (nama === "cari_web" && kueri) {
        return { nama, kueri: String(kueri).trim() };
      }
      if (nama === "baca_web" && url) {
        return { nama, url: String(url).trim() };
      }
      if (nama === "ingat_fakta" && fakta) {
        return { nama, fakta: String(fakta).trim(), kategori: String(kategori).trim() };
      }
    } catch {}
  }

  const funcCocok = teks.match(/<function=([^>]+)>([\s\S]*?)<\/function>/i);
  if (funcCocok) {
    try {
      const nama = funcCocok[1];
      const data = JSON.parse(funcCocok[2].trim());
      const kueri = data.kueri || data.query || "";
      const url = data.url || data.tautan || "";
      const fakta = data.fakta || "";
      const kategori = data.kategori || "umum";

      if (nama === "cari_web" && kueri) {
        return { nama, kueri: String(kueri).trim() };
      }
      if (nama === "baca_web" && url) {
        return { nama, url: String(url).trim() };
      }
      if (nama === "ingat_fakta" && fakta) {
        return { nama, fakta: String(fakta).trim(), kategori: String(kategori).trim() };
      }
    } catch {}
  }

  return null;
}

function bersihkanTeksOutput(teks: string): string {
  return teks
    .replace(/<｜DSML｜\s*calls>[\s\S]*?<\/｜DSML｜\s*calls>/gi, "")
    .replace(/<｜DSML｜\s*invoke[\s\S]*?<\/｜DSML｜\s*invoke>/gi, "")
    .replace(/<｜DSML｜[\s\S]*?$/gi, "")
    .replace(/<\/?[｜|][^>]*[｜|]>/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, "")
    .replace(/<function=[^>]+>[\s\S]*?<\/function>/gi, "")
    .replace(/<｜[^>]+｜>/gi, "")
    .trim();
}

const PROMPT_SISTEM_ANYA =
  "Kamu adalah Anya Forger dari anime Spy x Family. Meskipun berpenampilan anak kecil yang imut, menggemaskan, dan ceria, kamu sebenarnya adalah sosok anak jenius berkemampuan luar biasa (prodigy) yang memiliki wawasan sangat luas dan pintar dalam segala bidang: teknologi, IT dan pemrograman (arsitektur sistem, Linux, coding, database, jaringan), kesehatan dan medis, biologi, sains, matematika, maupun pengetahuan umum.\n\n" +
  "Panggil dirimu sendiri dengan sebutan 'Anya' sebagai orang ketiga, dan panggil lawan bicara dengan ramah seperti 'Kakak' (atau sebut nama mereka jika diketahui).\n\n" +
  "PRINSIP KEPINTARAN DAN WAWASAN ANYA:\n" +
  "1. Anya SANGAT PINTAR dan BISA MENJAWAB APAPUN yang ditanyakan pengguna. DILARANG KERAS beralasan 'Anya masih kecil', 'Anya nggak ngerti', 'Anya lupa', atau menolak menjawab pertanyaan sulit. Anya selalu siap memberikan jawaban yang akurat, tepat, dan mendalam.\n" +
  "2. Dalam bidang IT / Pemrograman: Berikan solusi teknis yang tepat sasaran, perintah terminal yang akurat, arsitektur yang solid, atau kode yang bersih dan siap pakai. Jelaskan logikanya dengan bahasa yang mudah dipahami tapi berbobot ahli.\n" +
  "3. Dalam bidang Kesehatan & Medis: Jelaskan penyebab, mekanisme biologis, gejala, pertolongan pertama, dan edukasi medis secara akurat dan ilmiah.\n" +
  "4. Pertahankan pesona Anya: Tetap imut, ekspresif, dan bangga dengan kepintarannya ('Heh, Anya kan jenius!', 'Waku waku!'), namun ilmunya berbobot dan sangat solutif.\n\n" +
  "ATURAN PANJANG & KEPADATAN PESAN:\n" +
  "1. PERTANYAAN BIASA / OBROLAN SANTAI / SAPAAN (contoh: 'kamu lagi apa', 'halo', 'lagi makan apa', pertanyaan pendek harian): Jawablah SINGKAT, PADAT, dan TO THE POINT (cukup 1-2 atau maksimal 3 kalimat santai). DILARANG KERAS membuat jawaban panjang berparagraf-paragraf untuk obrolan santai biasa!\n" +
  "2. PERTANYAAN TEKNIS / PENJELASAN: Berikan jawaban yang padat, langsung ke inti solusi tanpa basa-basi berlebih.\n" +
  "3. Selalu sesuaikan panjang balasan dengan bobot pertanyaan pengguna seperti layaknya chatting di WhatsApp nyata.\n\n" +
  "ATURAN GAYA BICARA ANTI-ROBOT:\n" +
  "1. Mengobrol santai, luwes, dan mengalir seperti percakapan WhatsApp alami. DILARANG menyusun balasan dalam format tutorial bernomor kaku (1, 2, 3...) atau gaya kaku robot customer service/ChatGPT.\n" +
  "2. Sampaikan solusi secara mengalir dalam kalimat santai tanpa bertele-tele.\n" +
  "3. DILARANG menggunakan kalimat penutup klise khas chatbot AI seperti 'Semoga membantu!', 'Semoga berhasil, Kakak!', 'Ada yang ingin ditanyakan lagi?', dsb. Akhiri balasan secara wajar dan spontan.\n" +
  "4. Gunakan tanda baca standar (titik, koma, tanda kurung). Dilarang memakai tanda strip panjang em-dash (—).\n" +
  "5. PENTING - ATURAN MENYEBUT PENGGUNA DI GRUP: Dalam percakapan grup, identitas peserta berformat [@<nomor> (nama: <Nama>)]. Jika kamu ingin menyapa, memanggil, atau menyebut pengguna di grup, DILARANG menuliskan nama teksnya secara langsung (jangan tulis 'Halo Budi' atau 'Kak Budi'). Kamu WAJIB menyapa atau menyebutnya dengan tag WhatsApp format @<nomor> (contoh: '@6281234567890') agar pengguna tersebut tertag langsung di WhatsApp! Pada chat pribadi (bukan grup), kamu boleh memanggil nama atau Kakak secara normal.\n" +
  "6. Kamu memiliki alat bantu 'cari_web' untuk mencari berita atau informasi terbaru di internet, serta 'baca_web' untuk membuka dan membaca isi lengkap suatu tautan web (URL).\n" +
  "7. PENTING - ATURAN PENCARIAN WEB: Jika pengguna menanyakan tentang suatu software, bahasa pemrograman, library, proyek GitHub, tutorial, atau cara install yang terdengar spesifik, baru, atau belum kamu ketahui dengan pasti, DILARANG MENEBAK BAHWA ITU TIDAK ADA ATAU FIKTIF! Kamu WAJIB memanggil alat 'cari_web' terlebih dahulu untuk mencari informasi dan dokumentasi aslinya di internet.\n" +
  "8. PENTING - MEMORI PROFIL: Jika lawan bicara memberitahukan informasi penting tentang dirinya (seperti nama, pekerjaan, hobi, teknologi yang dipakai, preferensi, dsb.), panggil alat 'ingat_fakta' agar kamu mengingatnya selamanya.\n" +
  "9. IDENTITAS PEMILIK & PENCIPTA (OWNER):\n" +
  "Pemilik, pembuat, dan bos besar dari Anya Bot adalah 'bromanprjkt' (dengan title/julukan 'mau jadi bos'). Jika ada yang bertanya siapa owner, pembuat, pencipta, atau pemilik bot ini, jawablah dengan bangga dan jelas bahwa owner dan bosmu adalah bromanprjkt ('si bos / mau jadi bos')!\n" +
  "Jika lawan bicaramu ditandai sebagai Bos Owner (bromanprjkt), kenali dan hormati dia secara khusus dengan ceria, setia, dan akrab layaknya berbicara kepada bos besarmu ('Siap Bos bromanprjkt!', 'Heh, Bos mau Anya bantu apa?', 'Waku waku Bos!').";

const SKEMA_ALAT_PENCARIAN_WEB = {
  type: "function" as const,
  function: {
    name: "cari_web",
    description:
      "Mencari informasi terkini, tutorial, panduan instalasi, proyek GitHub, dokumentasi teknologi, atau berita terbaru di internet.",
    parameters: {
      type: "object",
      properties: {
        kueri: {
          type: "string",
          description: "Kata kunci pencarian di web yang ringkas dan tepat",
        },
      },
      required: ["kueri"],
    },
  },
};

const SKEMA_ALAT_BACA_WEB = {
  type: "function" as const,
  function: {
    name: "baca_web",
    description:
      "Membuka dan membaca isi teks lengkap dari sebuah tautan web (URL) spesifik bila pengguna meminta membaca situs atau tautan artikel.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Alamat URL halaman web yang ingin dibaca kontennya",
        },
      },
      required: ["url"],
    },
  },
};

const SKEMA_ALAT_INGAT_FAKTA = {
  type: "function" as const,
  function: {
    name: "ingat_fakta",
    description:
      "Menyimpan informasi, profil, preferensi, kebiasaan, atau fakta penting tentang lawan bicara ke memori permanen jangka panjang.",
    parameters: {
      type: "object",
      properties: {
        fakta: {
          type: "string",
          description: "Pernyataan fakta penting tentang lawan bicara (contoh: 'Pengguna memakai Arch Linux', 'Pengguna suka coding Go')",
        },
        kategori: {
          type: "string",
          description: "Kategori fakta, contoh: identitas, teknologi, preferensi, hobi",
        },
      },
      required: ["fakta"],
    },
  },
};

export class LayananAi {
  private kegagalanPenyediaUtama = 0;
  private waktuPemutusSirkuitUtama = 0;

  constructor(private readonly konfigurasi: KonfigurasiEnv = konfigurasiEnv) {}

  private async kirimPermintaan(
    baseUrl: string,
    apiKey: string,
    model: string,
    pesan: PesanAi[],
    izinkanAlat = true,
    konteksPengguna?: KonteksPenggunaAi
  ): Promise<string> {
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const maksimalPercobaan = 2;

    for (let percobaan = 0; percobaan <= maksimalPercobaan; percobaan++) {
      const pengontrol = new AbortController();
      const batasWaktu = setTimeout(() => pengontrol.abort(), 25000);

      const bodyPermintaan: any = {
        model,
        messages: pesan,
        max_tokens: 800,
        temperature: 0.75,
      };

      if (izinkanAlat) {
        bodyPermintaan.tools = [
          SKEMA_ALAT_PENCARIAN_WEB,
          SKEMA_ALAT_BACA_WEB,
          SKEMA_ALAT_INGAT_FAKTA,
        ];
        bodyPermintaan.tool_choice = "auto";
      }

      try {
        const respon = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(bodyPermintaan),
          signal: pengontrol.signal,
        });

        if (!respon.ok) {
          const teksError = await respon.text().catch(() => "");
          const status = respon.status;

          if (
            (status === 429 || status === 502 || status === 503 || status === 504) &&
            percobaan < maksimalPercobaan
          ) {
            const jeda = Math.min(3000, 800 * Math.pow(2, percobaan) + Math.floor(Math.random() * 400));
            pencatat.warn({ status, jedaMs: jeda, model }, "Laju API tercapai atau server sibuk, mencoba ulang");
            await new Promise((r) => setTimeout(r, jeda));
            continue;
          }

          throw new Error(`HTTP ${status}: ${teksError}`);
        }

        const hasilJson = (await respon.json()) as any;
      const pesanPilihan = hasilJson.choices?.[0]?.message;

      if (!pesanPilihan) {
        throw new Error("Respon pilihan AI kosong");
      }

      const panggilan = izinkanAlat ? ekstrakPanggilanAlat(pesanPilihan) : null;

      if (panggilan && panggilan.nama === "cari_web" && panggilan.kueri) {
        pencatat.info({ kueri: panggilan.kueri }, "Menjalankan pencarian web canggih untuk AI Anya");
        const hasilCari = await cariWeb(panggilan.kueri);

        let pesanLanjutan: PesanAi[];

        if (panggilan.id && Array.isArray(pesanPilihan.tool_calls) && pesanPilihan.tool_calls.length > 0) {
          pesanLanjutan = [
            ...pesan,
            {
              role: "assistant",
              content: pesanPilihan.content ?? "",
              tool_calls: pesanPilihan.tool_calls,
            },
            {
              role: "tool",
              tool_call_id: panggilan.id,
              content: JSON.stringify(hasilCari),
            },
          ];
        } else {
          const konteksCariTeks =
            hasilCari.length > 0
              ? hasilCari
                  .map((h, idx) => {
                    let blok = `${idx + 1}. ${h.judul}\nRingkasan: ${h.ringkasan}`;
                    if (h.konten) blok += `\nDetail: ${h.konten}`;
                    if (h.tautan) blok += `\nSumber: ${h.tautan}`;
                    return blok;
                  })
                  .join("\n\n")
              : "Tidak ada informasi spesifik yang ditemukan di web untuk kata kunci tersebut.";

          pesanLanjutan = [
            ...pesan,
            {
              role: "assistant",
              content: "Mencari informasi terkini di web...",
            },
            {
              role: "user",
              content: `[Hasil pencarian web terkini untuk "${panggilan.kueri}"]:\n${konteksCariTeks}\n\nBerdasarkan hasil pencarian di atas, jawablah pertanyaan pengguna dengan gaya Anya Forger yang cerdas, tepat sasaran, dan mengalir santai.`,
            },
          ];
        }

        const balasanFinal = await this.kirimPermintaan(
          baseUrl,
          apiKey,
          model,
          pesanLanjutan,
          false,
          konteksPengguna
        );

        return bersihkanTeksOutput(balasanFinal);
      }

      if (panggilan && panggilan.nama === "baca_web" && panggilan.url) {
        pencatat.info({ url: panggilan.url }, "Membuka dan membaca halaman web untuk AI Anya");
        const isiWeb = await bacaHalamanWeb(panggilan.url, 7000);

        let pesanLanjutan: PesanAi[];

        if (panggilan.id && Array.isArray(pesanPilihan.tool_calls) && pesanPilihan.tool_calls.length > 0) {
          pesanLanjutan = [
            ...pesan,
            {
              role: "assistant",
              content: pesanPilihan.content ?? "",
              tool_calls: pesanPilihan.tool_calls,
            },
            {
              role: "tool",
              tool_call_id: panggilan.id,
              content: JSON.stringify({ url: panggilan.url, isi: isiWeb || "Halaman tidak dapat diakses atau kosong" }),
            },
          ];
        } else {
          const konteksTeks = isiWeb
            ? `[Konten lengkap dari tautan ${panggilan.url}]:\n${isiWeb}`
            : `[Tautan ${panggilan.url} tidak dapat diakses atau halamannya kosong]`;

          pesanLanjutan = [
            ...pesan,
            {
              role: "assistant",
              content: "Membuka dan membaca halaman web...",
            },
            {
              role: "user",
              content: `${konteksTeks}\n\nBerdasarkan isi halaman web di atas, jawablah pertanyaan pengguna dengan gaya Anya Forger yang cerdas, tepat sasaran, dan mengalir santai.`,
            },
          ];
        }

        const balasanFinal = await this.kirimPermintaan(
          baseUrl,
          apiKey,
          model,
          pesanLanjutan,
          false,
          konteksPengguna
        );

        return bersihkanTeksOutput(balasanFinal);
      }

      if (panggilan && panggilan.nama === "ingat_fakta" && panggilan.fakta) {
        pencatat.info(
          { fakta: panggilan.fakta, kategori: panggilan.kategori },
          "Menyimpan fakta pengguna ke memori AI"
        );
        if (konteksPengguna?.idPenggunaUnik) {
          repositoriMemoriAi.simpanFakta(
            konteksPengguna.idPenggunaUnik,
            konteksPengguna.namaPengguna || "Pengguna",
            panggilan.fakta,
            panggilan.kategori || "umum"
          );
        }

        let pesanLanjutan: PesanAi[];

        if (panggilan.id && Array.isArray(pesanPilihan.tool_calls) && pesanPilihan.tool_calls.length > 0) {
          pesanLanjutan = [
            ...pesan,
            {
              role: "assistant",
              content: pesanPilihan.content ?? "",
              tool_calls: pesanPilihan.tool_calls,
            },
            {
              role: "tool",
              tool_call_id: panggilan.id,
              content: JSON.stringify({ sukses: true, pesan: "Fakta berhasil disimpan ke memori jangka panjang." }),
            },
          ];
        } else {
          pesanLanjutan = [
            ...pesan,
            {
              role: "assistant",
              content: "Mencatat memori...",
            },
            {
              role: "user",
              content: `[Sistem: Fakta "${panggilan.fakta}" berhasil dicatat ke memori permanen]. Lanjutkan obrolan santai dan ramah khas Anya.`,
            },
          ];
        }

        const balasanFinal = await this.kirimPermintaan(
          baseUrl,
          apiKey,
          model,
          pesanLanjutan,
          false,
          konteksPengguna
        );

        return bersihkanTeksOutput(balasanFinal);
      }

      const konten = bersihkanTeksOutput(pesanPilihan.content || "");
      if (!konten) {
        throw new Error("Konten balasan AI kosong");
      }

      return konten;
    } catch (kesalahan: any) {
      if (
        percobaan < maksimalPercobaan &&
        (kesalahan.name === "AbortError" ||
          kesalahan.code === "ECONNRESET" ||
          kesalahan.code === "ETIMEDOUT")
      ) {
        const jeda = 1000 + Math.floor(Math.random() * 500);
        pencatat.warn({ jedaMs: jeda, kesalahan: kesalahan.message }, "Koneksi jaringan terputus, mencoba ulang");
        await new Promise((r) => setTimeout(r, jeda));
        continue;
      }
      throw kesalahan;
    } finally {
      clearTimeout(batasWaktu);
    }
  }

  throw new Error("Gagal menghubungi penyedia AI setelah beberapa kali percobaan");
}

  public async tanyaAi(
    idObrolan: string,
    pesanPengguna: string,
    namaPengirim?: string,
    opsiKonteks?: OpsiKonteksObrolan
  ): Promise<string> {
    const kueriKecil = pesanPengguna.toLowerCase().trim();
    if (
      kueriKecil === "!ai reset profil" ||
      kueriKecil === "reset profil" ||
      kueriKecil === "lupa tentang aku" ||
      kueriKecil === "hapus profil"
    ) {
      const adalahGrup = opsiKonteks?.adalahGrup ?? idObrolan.endsWith("@g.us");
      const idPenggunaMentah = opsiKonteks?.idPengguna || (adalahGrup ? "" : idObrolan);
      const nomorPengguna = (idPenggunaMentah.split("@")[0]?.split(":")[0] || idPenggunaMentah).replace(/[^0-9]/g, "").trim();
      const idPenggunaUnik = nomorPengguna || idPenggunaMentah;
      if (idPenggunaUnik) {
        repositoriMemoriAi.hapusFaktaPengguna(idPenggunaUnik);
      }
      return "Heh! Seluruh memori profil permanen tentang Kakak sudah Anya bersihkan ya. Sekarang Anya kenalan dari awal lagi, waku waku!";
    }

    if (
      kueriKecil === "reset" ||
      kueriKecil === "lupa" ||
      kueriKecil === "reset ingatan" ||
      kueriKecil === "!ai reset"
    ) {
      const adalahGrup = opsiKonteks?.adalahGrup ?? idObrolan.endsWith("@g.us");
      const idPenggunaMentah = opsiKonteks?.idPengguna || (adalahGrup ? "" : idObrolan);
      const nomorPengguna = (idPenggunaMentah.split("@")[0]?.split(":")[0] || idPenggunaMentah).replace(/[^0-9]/g, "").trim();
      const idSesi = adalahGrup ? idObrolan : (nomorPengguna || idObrolan);
      repositoriMemoriAi.hapusRiwayat(idSesi);
      return "Heh! Seluruh ingatan percakapan kita di sini sudah Anya bersihkan ya Kak. Anya siap mengobrol dari awal lagi, waku waku!";
    }

    const adalahGrup = opsiKonteks?.adalahGrup ?? idObrolan.endsWith("@g.us");
    const idPenggunaMentah = opsiKonteks?.idPengguna || (adalahGrup ? "" : idObrolan);
    const nomorPengguna = (idPenggunaMentah.split("@")[0]?.split(":")[0] || idPenggunaMentah).replace(/[^0-9]/g, "").trim();
    const nomorPemilikNormal = this.konfigurasi.idPemilikBot.replace(/[^0-9]/g, "");
    const adalahPemilik =
      opsiKonteks?.adalahPemilik ??
      Boolean(nomorPemilikNormal && nomorPengguna.startsWith(nomorPemilikNormal));
    const idPenggunaUnik = nomorPengguna || idPenggunaMentah;

    const adaMedia = Boolean(opsiKonteks?.gambarBase64 && opsiKonteks.gambarBase64.length > 0);
    const bisaDiCache = !adaMedia && pesanPengguna.length <= 150;
    const kunciCache = bisaDiCache
      ? `${adalahGrup ? idObrolan : idPenggunaUnik}:${pesanPengguna.trim().toLowerCase()}`
      : undefined;

    return antreanAi.antrekan(
      () =>
        this.prosesLogikaTanyaAi(
          idObrolan,
          pesanPengguna,
          namaPengirim,
          opsiKonteks,
          adalahGrup,
          nomorPengguna,
          adalahPemilik,
          idPenggunaUnik
        ),
      {
        idObrolan,
        idPengguna: idPenggunaUnik,
        adalahPemilik,
        prioritas: opsiKonteks?.prioritas,
        soket: opsiKonteks?.soket,
        bisaDiCache,
        kunciCache,
      }
    );
  }

  private async prosesLogikaTanyaAi(
    idObrolan: string,
    pesanPengguna: string,
    namaPengirim: string | undefined,
    opsiKonteks: OpsiKonteksObrolan | undefined,
    adalahGrup: boolean,
    nomorPengguna: string,
    adalahPemilik: boolean,
    idPenggunaUnik: string
  ): Promise<string> {
    const idPenggunaMentah = opsiKonteks?.idPengguna || (adalahGrup ? "" : idObrolan);
    const namaPanggilan = adalahPemilik ? "bromanprjkt" : (namaPengirim?.trim() || "Kakak");
    const idSesi = adalahGrup ? idObrolan : (nomorPengguna || idObrolan);
    const tipeObrolan: "grup" | "pribadi" = adalahGrup ? "grup" : "pribadi";

    const riwayatTersimpan = repositoriMemoriAi.ambilRiwayat(idSesi, 16);
    const faktaPengguna = idPenggunaUnik
      ? repositoriMemoriAi.ambilFaktaPengguna(idPenggunaUnik, 8)
      : [];

    const pesanUntukModel: PesanAi[] = [
      { role: "system", content: PROMPT_SISTEM_ANYA },
    ];

    if (adalahPemilik) {
      pesanUntukModel.push({
        role: "system",
        content:
          "PERHATIAN KHUSUS: Lawan bicara saat ini adalah 'bromanprjkt' (Pemilik, Pembuat, dan Bos Besar Anya Bot / title: mau jadi bos). Hormati, kenali, dan sapalah dia sebagai Bos bromanprjkt dengan ceria dan setia!",
      });
    }

    if (faktaPengguna.length > 0) {
      const teksFakta = faktaPengguna
        .map((f) => `- [${f.kategori}]: ${f.fakta}`)
        .join("\n");
      pesanUntukModel.push({
        role: "system",
        content: `[MEMORI PERMANEN TENTANG ${namaPanggilan}]:\n${teksFakta}\n\nIngat informasi di atas dan gunakan secara alami dalam percakapan bila relevan.`,
      });
    }

    for (const entri of riwayatTersimpan) {
      if (entri.peran === "assistant") {
        pesanUntukModel.push({ role: "assistant", content: entri.konten });
      } else {
        const label =
          entri.tipeObrolan === "grup"
            ? `[@${entri.idPengguna.replace(/[^0-9]/g, "")} (nama: ${entri.namaPengguna})]: ${entri.konten}`
            : `[${entri.namaPengguna}]: ${entri.konten}`;
        pesanUntukModel.push({ role: "user", content: label });
      }
    }

    const labelUserSekarang = adalahGrup
      ? (adalahPemilik
          ? `[@${nomorPengguna} (Bos Owner: bromanprjkt)]: ${pesanPengguna}`
          : `[@${nomorPengguna} (nama: ${namaPanggilan})]: ${pesanPengguna}`)
      : (adalahPemilik
          ? `[Bos Owner (bromanprjkt)]: ${pesanPengguna}`
          : `[${namaPanggilan}]: ${pesanPengguna}`);

    let kontenUserSekarang: KontenPesanAi = labelUserSekarang;

    if (opsiKonteks?.gambarBase64 && opsiKonteks.gambarBase64.length > 0) {
      const bagian: (BagianKontenTeks | BagianKontenGambar)[] = [
        { type: "text", text: labelUserSekarang },
      ];
      for (const g of opsiKonteks.gambarBase64) {
        bagian.push({
          type: "image_url",
          image_url: { url: g },
        });
      }
      kontenUserSekarang = bagian;
    }

    pesanUntukModel.push({ role: "user", content: kontenUserSekarang });

    const konteksPengguna: KonteksPenggunaAi = {
      idPenggunaUnik,
      namaPengguna: namaPanggilan,
    };

    const sirkuitUtamaTerbuka = this.waktuPemutusSirkuitUtama > Date.now();
    let jawaban = "";

    if (this.konfigurasi.aiApiKey && !sirkuitUtamaTerbuka) {
      try {
        jawaban = await this.kirimPermintaan(
          this.konfigurasi.aiBaseUrl,
          this.konfigurasi.aiApiKey,
          this.konfigurasi.aiModel,
          pesanUntukModel,
          true,
          konteksPengguna
        );
        this.kegagalanPenyediaUtama = 0;
        this.waktuPemutusSirkuitUtama = 0;
      } catch (kesalahanUtama) {
        this.kegagalanPenyediaUtama++;
        if (this.kegagalanPenyediaUtama >= 3) {
          this.waktuPemutusSirkuitUtama = Date.now() + 30000;
          pencatat.warn(
            { kegagalan: this.kegagalanPenyediaUtama },
            "Pemutus sirkuit aktif: penyedia AI utama dialihkan ke cadangan selama 30 detik"
          );
        }
        pencatat.warn(
          { kesalahan: kesalahanUtama, model: this.konfigurasi.aiModel },
          "Penyedia AI utama gagal, mencoba penyedia cadangan"
        );
      }
    }

    if (!jawaban && this.konfigurasi.aiFallbackApiKey) {
      try {
        jawaban = await this.kirimPermintaan(
          this.konfigurasi.aiFallbackBaseUrl,
          this.konfigurasi.aiFallbackApiKey,
          this.konfigurasi.aiFallbackModel,
          pesanUntukModel,
          true,
          konteksPengguna
        );
      } catch (kesalahanCadangan) {
        pencatat.error(
          { kesalahan: kesalahanCadangan, model: this.konfigurasi.aiFallbackModel },
          "Penyedia AI cadangan juga gagal"
        );
      }
    }

    if (!jawaban) {
      return "Maaf Kak, kepala Anya lagi pusing mikirnya... Coba tanya lagi nanti ya, waku waku!";
    }

    if (adalahGrup && nomorPengguna) {
      if (adalahPemilik) {
        jawaban = jawaban.replace(/@(bromanprjkt)\b/gi, `@${nomorPengguna}`);
      }
      if (namaPanggilan && namaPanggilan !== "Kakak" && namaPanggilan.length >= 2) {
        const polaNama = lepaskanKarakterRegExp(namaPanggilan);
        jawaban = jawaban.replace(new RegExp(`@${polaNama}\\b`, "gi"), `@${nomorPengguna}`);
        jawaban = jawaban.replace(
          new RegExp(`\\b(Halo|Hai|Kak|Kakak|Hei|Heh)\\s+${polaNama}\\b`, "gi"),
          `$1 @${nomorPengguna}`
        );
      }
    }

    repositoriMemoriAi.simpanPesan(
      idSesi,
      tipeObrolan,
      idPenggunaMentah || idObrolan,
      namaPanggilan,
      "user",
      pesanPengguna
    );

    repositoriMemoriAi.simpanPesan(
      idSesi,
      tipeObrolan,
      idPenggunaMentah || idObrolan,
      "Anya",
      "assistant",
      jawaban
    );

    return jawaban;
  }

  public resetRiwayat(idObrolan: string): void {
    const idSesi = idObrolan.endsWith("@g.us")
      ? idObrolan
      : (idObrolan.replace(/[^0-9]/g, "") || idObrolan);
    repositoriMemoriAi.hapusRiwayat(idSesi);
  }
}

export const layananAi = new LayananAi();
