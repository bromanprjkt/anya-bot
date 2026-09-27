import { describe, it, expect } from "vitest";
import { PembatasFrekuensi } from "../../src/core/rate-limiter.js";

describe("PembatasFrekuensi", () => {
  it("harus mengizinkan permintaan dalam batas", () => {
    const pembatas = new PembatasFrekuensi();
    const kunci = "user1";

    const hasil1 = pembatas.periksaBatas(kunci, 3, 1000);
    const hasil2 = pembatas.periksaBatas(kunci, 3, 1000);

    expect(hasil1.diizinkan).toBe(true);
    expect(hasil2.diizinkan).toBe(true);
    expect(hasil2.totalPermintaan).toBe(2);
  });

  it("harus menolak permintaan yang melebihi batas maksimal", () => {
    const pembatas = new PembatasFrekuensi();
    const kunci = "user2";

    pembatas.periksaBatas(kunci, 2, 1000);
    pembatas.periksaBatas(kunci, 2, 1000);
    const hasil3 = pembatas.periksaBatas(kunci, 2, 1000);

    expect(hasil3.diizinkan).toBe(false);
    expect(hasil3.sisaWaktuMilidetik).toBeGreaterThan(0);
  });

  it("harus mereset catatan saat reset dipanggil", () => {
    const pembatas = new PembatasFrekuensi();
    const kunci = "user3";

    pembatas.periksaBatas(kunci, 1, 1000);
    expect(pembatas.periksaBatas(kunci, 1, 1000).diizinkan).toBe(false);

    pembatas.reset(kunci);
    expect(pembatas.periksaBatas(kunci, 1, 1000).diizinkan).toBe(true);
  });
});
