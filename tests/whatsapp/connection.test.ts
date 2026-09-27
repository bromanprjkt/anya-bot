import { describe, it, expect } from "vitest";
import { tanganiPembaruanKoneksi } from "../../src/whatsapp/connection.js";
import { DisconnectReason } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";

describe("Penanganan Koneksi WhatsApp", () => {
  it("harus mengembalikan status tidak perlu koneksi ulang saat koneksi terbuka (open)", () => {
    const hasil = tanganiPembaruanKoneksi({ connection: "open" });
    expect(hasil.harusMenghubungkanUlang).toBe(false);
  });

  it("harus mengembalikan harus menghubungkan ulang saat terjadi error jaringan sementara", () => {
    const errorSementara = new Boom("Connection Lost", {
      statusCode: DisconnectReason.connectionLost,
    });

    const hasil = tanganiPembaruanKoneksi({
      connection: "close",
      lastDisconnect: { error: errorSementara, date: new Date() },
    });

    expect(hasil.harusMenghubungkanUlang).toBe(true);
    expect(hasil.alasanPenutupan).toBe(DisconnectReason.connectionLost);
  });

  it("tidak boleh menghubungkan ulang jika pengguna melakukan logout (loggedOut)", () => {
    const errorLogout = new Boom("Logged Out", {
      statusCode: DisconnectReason.loggedOut,
    });

    const hasil = tanganiPembaruanKoneksi({
      connection: "close",
      lastDisconnect: { error: errorLogout, date: new Date() },
    });

    expect(hasil.harusMenghubungkanUlang).toBe(false);
    expect(hasil.alasanPenutupan).toBe(DisconnectReason.loggedOut);
  });
});
