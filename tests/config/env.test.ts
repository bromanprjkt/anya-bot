import { describe, it, expect } from "vitest";
import { uraiKonfigurasiEnv } from "../../src/config/env.js";

describe("Penguraian Konfigurasi Lingkungan (Env)", () => {
  it("harus menggunakan nilai bawaan jika variabel lingkungan kosong", () => {
    const hasil = uraiKonfigurasiEnv({});

    expect(hasil.lingkungan).toBe("development");
    expect(hasil.tingkatLog).toBe("info");
    expect(hasil.awalanPerintah).toBe("!");
    expect(hasil.jalurDatabase).toBe("./data/anya.db");
    expect(hasil.direktoriSementara).toBe("./temp");
    expect(hasil.batasPekerjaanMediaBersamaan).toBe(2);
    expect(hasil.bacaPesanOtomatis).toBe(true);
  });

  it("harus berhasil mengurai nilai variabel lingkungan yang valid", () => {
    const lingkunganUji: NodeJS.ProcessEnv = {
      NODE_ENV: "production",
      LOG_LEVEL: "warn",
      BOT_PREFIX: "#",
      BOT_OWNER_ID: "628123456789@s.whatsapp.net",
      DATABASE_PATH: "/custom/data/anya.db",
      TEMP_DIRECTORY: "/custom/temp",
      SESSION_NAME: "sesi-kustom",
      MAX_CONCURRENT_MEDIA_JOBS: "4",
      DOWNLOADER_API_URL: "https://api.example.com",
      DOWNLOADER_API_KEY: "rahasia123",
      AUTO_READ: "false",
    };

    const hasil = uraiKonfigurasiEnv(lingkunganUji);

    expect(hasil.lingkungan).toBe("production");
    expect(hasil.tingkatLog).toBe("warn");
    expect(hasil.awalanPerintah).toBe("#");
    expect(hasil.idPemilikBot).toBe("628123456789@s.whatsapp.net");
    expect(hasil.jalurDatabase).toBe("/custom/data/anya.db");
    expect(hasil.direktoriSementara).toBe("/custom/temp");
    expect(hasil.namaSesi).toBe("sesi-kustom");
    expect(hasil.batasPekerjaanMediaBersamaan).toBe(4);
    expect(hasil.urlApiPengunduh).toBe("https://api.example.com");
    expect(hasil.kunciApiPengunduh).toBe("rahasia123");
    expect(hasil.bacaPesanOtomatis).toBe(false);
  });

  it("harus melempar kesalahan jika NODE_ENV tidak valid", () => {
    const lingkunganSalah: NodeJS.ProcessEnv = {
      NODE_ENV: "staging" as unknown as string,
    };

    expect(() => uraiKonfigurasiEnv(lingkunganSalah)).toThrow(
      "Konfigurasi lingkungan tidak valid"
    );
  });

  it("harus melempar kesalahan jika MAX_CONCURRENT_MEDIA_JOBS bukan angka positif", () => {
    const lingkunganSalah: NodeJS.ProcessEnv = {
      MAX_CONCURRENT_MEDIA_JOBS: "-1",
    };

    expect(() => uraiKonfigurasiEnv(lingkunganSalah)).toThrow(
      "Konfigurasi lingkungan tidak valid"
    );
  });
});
