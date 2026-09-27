import { buatPencatat } from "../../utils/logger.js";

const pencatat = buatPencatat("LayananAntiTautan");

export class LayananAntiTautan {
  private readonly daftarDomainDiizinkan = new Set<string>([
    "whatsapp.com",
    "google.com",
    "youtube.com",
    "youtu.be",
    "github.com",
    "wikipedia.org",
  ]);

  // Pola regex deteksi URL HTTP/HTTPS dan tautan undangan grup WhatsApp
  private readonly polaTautan = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*/gi;
  private readonly polaUndanganGrupWa = /chat\.whatsapp\.com\/[a-zA-Z0-9]{20,24}/i;

  public tambahDomainDiizinkan(domain: string): void {
    this.daftarDomainDiizinkan.add(domain.toLowerCase());
    pencatat.debug({ domain }, "Domain diizinkan ditambahkan ke daftar putih");
  }

  public ambilDaftarDomainDiizinkan(): string[] {
    return Array.from(this.daftarDomainDiizinkan);
  }

  /**
   * Mengekstrak seluruh URL yang terdapat dalam teks.
   */
  public ekstrakTautan(teks: string): string[] {
    const hasil = teks.match(this.polaTautan);
    return hasil ? Array.from(hasil) : [];
  }

  /**
   * Memeriksa apakah teks memuat tautan undangan grup WhatsApp (chat.whatsapp.com).
   */
  public adalahTautanGrupWhatsApp(teks: string): boolean {
    return this.polaUndanganGrupWa.test(teks);
  }

  /**
   * Memeriksa apakah suatu teks mengandung tautan terlarang
   * (tidak ada dalam daftar domain diizinkan atau merupakan undangan grup WhatsApp).
   */
  public apakahTautanTerlarang(teks: string): boolean {
    if (this.adalahTautanGrupWhatsApp(teks)) {
      return true;
    }

    const daftarUrl = this.ekstrakTautan(teks);
    if (daftarUrl.length === 0) {
      return false;
    }

    for (const urlStr of daftarUrl) {
      try {
        const urlObj = new URL(
          urlStr.startsWith("http") ? urlStr : `https://${urlStr}`
        );
        const host = urlObj.hostname.toLowerCase().replace(/^www\./, "");

        let diizinkan = false;
        for (const domainPutih of this.daftarDomainDiizinkan) {
          if (host === domainPutih || host.endsWith(`.${domainPutih}`)) {
            diizinkan = true;
            break;
          }
        }

        if (!diizinkan) {
          return true;
        }
      } catch {
        // Jika format URL tidak valid namun cocok pola regex, anggap mencurigakan
        return true;
      }
    }

    return false;
  }
}

export const layananAntiTautan = new LayananAntiTautan();
