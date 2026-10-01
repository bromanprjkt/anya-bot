import { PDFParse } from "pdf-parse";

const EKSTENSI_DOKUMEN_TEKS = new Set([
  "txt", "md", "csv", "json", "js", "ts", "jsx", "tsx", "py", "go",
  "java", "c", "cpp", "h", "hpp", "rs", "rb", "php", "html", "css",
  "scss", "xml", "yaml", "yml", "sh", "bash", "zsh", "sql", "env",
  "log", "ini", "toml", "conf", "vue", "svelte", "dart", "kt", "swift",
  "sl"
]);

export async function bacaDokumenLampiran(
  bufferBerkas: Buffer,
  namaBerkas: string,
  tipeMime?: string,
  batasKarakter = 12000
): Promise<string> {
  const namaKecil = namaBerkas.toLowerCase();
  const ekstensi = namaKecil.split(".").pop() || "";

  if (ekstensi === "pdf" || tipeMime === "application/pdf") {
    try {
      const dataUint8 = new Uint8Array(bufferBerkas);
      const parser = new PDFParse(dataUint8);
      const teks = await parser.getText();
      await parser.destroy();
      const hasil = (typeof teks === "string" ? teks : (teks as any)?.text || "").trim();
      return hasil.slice(0, batasKarakter);
    } catch {
      return "";
    }
  }

  if (EKSTENSI_DOKUMEN_TEKS.has(ekstensi) || tipeMime?.startsWith("text/")) {
    try {
      const teks = bufferBerkas.toString("utf-8");
      return teks.slice(0, batasKarakter).trim();
    } catch {
      return "";
    }
  }

  try {
    const teks = bufferBerkas.toString("utf-8");
    let karakterAneh = 0;
    for (let i = 0; i < Math.min(teks.length, 500); i++) {
      const kode = teks.charCodeAt(i);
      if (kode < 32 && kode !== 9 && kode !== 10 && kode !== 13) {
        karakterAneh++;
      }
    }
    if (karakterAneh > 25) {
      return "";
    }
    return teks.slice(0, batasKarakter).trim();
  } catch {
    return "";
  }
}
