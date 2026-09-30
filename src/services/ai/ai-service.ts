import { konfigurasiEnv, type KonfigurasiEnv } from "../../config/env.js";
import { buatPencatat } from "../../utils/logger.js";
import { cariWeb } from "./tools/web-search.js";
import { repositoriMemoriAi } from "../../repositories/ai-memory-repository.js";

const pencatat = buatPencatat("LayananAi");

export interface PanggilanAlatAi {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface PesanAi {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | null;
  tool_calls?: PanggilanAlatAi[];
  tool_call_id?: string;
}

export interface OpsiKonteksObrolan {
  adalahGrup?: boolean;
  idPengguna?: string;
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
  "5. Dalam percakapan grup, kamu mengenali siapa yang berbicara dari label [Nama (+Nomor)]. Ingat konteks obrolan sebelumnya agar nyambung.\n" +
  "6. Kamu memiliki alat bantu 'cari_web' untuk mencari berita atau informasi terbaru di internet bila pengguna menanyakan data teranyar.";

const SKEMA_ALAT_PENCARIAN_WEB = {
  type: "function" as const,
  function: {
    name: "cari_web",
    description:
      "Mencari informasi atau berita terbaru di internet bila pengguna menanyakan kabar terkini, fakta terbaru, cuaca, harga, atau data yang membutuhkan pencarian web.",
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

export class LayananAi {
  constructor(private readonly konfigurasi: KonfigurasiEnv = konfigurasiEnv) {}

  private async kirimPermintaan(
    baseUrl: string,
    apiKey: string,
    model: string,
    pesan: PesanAi[],
    izinkanAlat = true
  ): Promise<string> {
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const pengontrol = new AbortController();
    const batasWaktu = setTimeout(() => pengontrol.abort(), 20000);

    const bodyPermintaan: any = {
      model,
      messages: pesan,
      max_tokens: 800,
      temperature: 0.75,
    };

    if (izinkanAlat) {
      bodyPermintaan.tools = [SKEMA_ALAT_PENCARIAN_WEB];
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
        throw new Error(`HTTP ${respon.status}: ${teksError}`);
      }

      const hasilJson = (await respon.json()) as any;
      const pesanPilihan = hasilJson.choices?.[0]?.message;

      if (!pesanPilihan) {
        throw new Error("Respon pilihan AI kosong");
      }

      if (
        izinkanAlat &&
        Array.isArray(pesanPilihan.tool_calls) &&
        pesanPilihan.tool_calls.length > 0
      ) {
        const panggilan = pesanPilihan.tool_calls[0];
        if (panggilan?.function?.name === "cari_web") {
          let kueriPencarian = "";
          try {
            const argumen = JSON.parse(panggilan.function.arguments || "{}");
            kueriPencarian = argumen.kueri || argumen.query || "";
          } catch {
            kueriPencarian = "";
          }

          if (kueriPencarian) {
            pencatat.info({ kueri: kueriPencarian }, "Menjalankan pencarian web untuk AI Anya");
            const hasilCari = await cariWeb(kueriPencarian);

            const pesanLanjutan: PesanAi[] = [
              ...pesan,
              {
                role: "assistant",
                content: pesanPilihan.content ?? "",
                tool_calls: [panggilan],
              },
              {
                role: "tool",
                tool_call_id: panggilan.id,
                content: JSON.stringify(hasilCari),
              },
            ];

            return await this.kirimPermintaan(
              baseUrl,
              apiKey,
              model,
              pesanLanjutan,
              false
            );
          }
        }
      }

      const konten = pesanPilihan.content;
      if (typeof konten !== "string" || !konten.trim()) {
        throw new Error("Konten balasan AI kosong");
      }

      return konten.trim();
    } finally {
      clearTimeout(batasWaktu);
    }
  }

  public async tanyaAi(
    idObrolan: string,
    pesanPengguna: string,
    namaPengirim?: string,
    opsiKonteks?: OpsiKonteksObrolan
  ): Promise<string> {
    const adalahGrup = opsiKonteks?.adalahGrup ?? idObrolan.endsWith("@g.us");
    const idPenggunaMentah = opsiKonteks?.idPengguna || (adalahGrup ? "" : idObrolan);
    const nomorPengguna = idPenggunaMentah.replace(/[^0-9]/g, "");
    const namaPanggilan = namaPengirim?.trim() || "Kakak";

    const idSesi = adalahGrup
      ? idObrolan
      : (nomorPengguna || idObrolan);
    const tipeObrolan: "grup" | "pribadi" = adalahGrup ? "grup" : "pribadi";

    const kueriKecil = pesanPengguna.toLowerCase().trim();
    if (
      kueriKecil === "reset" ||
      kueriKecil === "lupa" ||
      kueriKecil === "reset ingatan" ||
      kueriKecil === "!ai reset"
    ) {
      repositoriMemoriAi.hapusRiwayat(idSesi);
      return "Heh! Seluruh ingatan percakapan kita di sini sudah Anya bersihkan ya Kak. Anya siap mengobrol dari awal lagi, waku waku!";
    }

    const riwayatTersimpan = repositoriMemoriAi.ambilRiwayat(idSesi, 16);
    const pesanUntukModel: PesanAi[] = [
      { role: "system", content: PROMPT_SISTEM_ANYA },
    ];

    for (const entri of riwayatTersimpan) {
      if (entri.peran === "assistant") {
        pesanUntukModel.push({ role: "assistant", content: entri.konten });
      } else {
        const label =
          entri.tipeObrolan === "grup"
            ? `[${entri.namaPengguna} (+${entri.idPengguna.replace(/[^0-9]/g, "")})]: ${entri.konten}`
            : `[${entri.namaPengguna}]: ${entri.konten}`;
        pesanUntukModel.push({ role: "user", content: label });
      }
    }

    const labelUserSekarang = adalahGrup
      ? `[${namaPanggilan} (+${nomorPengguna})]: ${pesanPengguna}`
      : `[${namaPanggilan}]: ${pesanPengguna}`;

    pesanUntukModel.push({ role: "user", content: labelUserSekarang });

    let jawaban = "";

    if (this.konfigurasi.aiApiKey) {
      try {
        jawaban = await this.kirimPermintaan(
          this.konfigurasi.aiBaseUrl,
          this.konfigurasi.aiApiKey,
          this.konfigurasi.aiModel,
          pesanUntukModel
        );
      } catch (kesalahanUtama) {
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
          pesanUntukModel
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
