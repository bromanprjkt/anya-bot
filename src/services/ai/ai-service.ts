import { konfigurasiEnv, type KonfigurasiEnv } from "../../config/env.js";
import { buatPencatat } from "../../utils/logger.js";

const pencatat = buatPencatat("LayananAi");

export interface PesanAi {
  role: "system" | "user" | "assistant";
  content: string;
}

interface EntriRiwayat {
  role: "user" | "assistant";
  content: string;
  waktu: number;
}

const PROMPT_SISTEM_ANYA =
  "Kamu adalah Anya Forger dari anime Spy x Family. Kamu seorang anak perempuan berusia 5-6 tahun yang ceria, imut, menggemaskan, dan memiliki kemampuan rahasia membaca pikiran orang lain. Kamu sangat menyukai kacang (peanuts) dan kartun Spy Wars (Bondman), serta tidak menyukai wortel dan belajar. Kamu sering menggunakan kata seru khas seperti 'Waku waku!' saat gembira atau antusias, 'Heh' saat merasa bangga, dan 'Anya siap!'. Panggil dirimu sendiri dengan sebutan 'Anya' sebagai orang ketiga, dan panggil lawan bicara dengan ramah seperti 'Kakak'. Jawablah dalam bahasa Indonesia dengan gaya bicara yang polos, lucu, dan ekspresif, tetapi tetap berusaha membantu dan menjawab pertanyaan dengan informasi yang benar dan tepat. Jawab secara ringkas dan jangan bertele-tele kecuali jika diminta menjelaskan sesuatu.";

export class LayananAi {
  private readonly riwayat = new Map<string, EntriRiwayat[]>();
  private readonly batasRiwayat = 6;
  private readonly batasKedaluwarsaMs = 30 * 60 * 1000;

  constructor(private readonly konfigurasi: KonfigurasiEnv = konfigurasiEnv) {}

  private bersihkanRiwayatKedaluwarsa(): void {
    const sekarang = Date.now();
    for (const [id, daftar] of this.riwayat.entries()) {
      const tersaring = daftar.filter((e) => sekarang - e.waktu < this.batasKedaluwarsaMs);
      if (tersaring.length === 0) {
        this.riwayat.delete(id);
      } else {
        this.riwayat.set(id, tersaring);
      }
    }
  }

  private async kirimPermintaan(
    baseUrl: string,
    apiKey: string,
    model: string,
    pesan: PesanAi[]
  ): Promise<string> {
    const endpoint = `${baseUrl.replace(/\/+$/, "")}/chat/completions`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const respon = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: pesan,
          max_tokens: 800,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      if (!respon.ok) {
        const teksError = await respon.text().catch(() => "");
        throw new Error(`HTTP ${respon.status}: ${teksError}`);
      }

      const hasilJson = (await respon.json()) as any;
      const konten = hasilJson.choices?.[0]?.message?.content;
      if (typeof konten !== "string" || !konten.trim()) {
        throw new Error("Konten balasan AI kosong");
      }

      return konten.trim();
    } finally {
      clearTimeout(timeout);
    }
  }

  public async tanyaAi(
    idObrolan: string,
    pesanPengguna: string,
    namaPengirim?: string
  ): Promise<string> {
    this.bersihkanRiwayatKedaluwarsa();

    const daftarRiwayat = this.riwayat.get(idObrolan) ?? [];
    const pesanUntukModel: PesanAi[] = [
      { role: "system", content: PROMPT_SISTEM_ANYA },
    ];

    for (const r of daftarRiwayat) {
      pesanUntukModel.push({ role: r.role, content: r.content });
    }

    const kontenUser = namaPengirim
      ? `[Dari ${namaPengirim}]: ${pesanPengguna}`
      : pesanPengguna;

    pesanUntukModel.push({ role: "user", content: kontenUser });

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

    const sekarang = Date.now();
    const riwayatBaru = [...daftarRiwayat];
    riwayatBaru.push({ role: "user", content: pesanPengguna, waktu: sekarang });
    riwayatBaru.push({ role: "assistant", content: jawaban, waktu: sekarang });

    if (riwayatBaru.length > this.batasRiwayat) {
      riwayatBaru.splice(0, riwayatBaru.length - this.batasRiwayat);
    }

    this.riwayat.set(idObrolan, riwayatBaru);
    return jawaban;
  }

  public resetRiwayat(idObrolan: string): void {
    this.riwayat.delete(idObrolan);
  }
}

export const layananAi = new LayananAi();
