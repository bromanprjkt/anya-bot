import { describe, it, expect } from "vitest";
import { AntreanPekerjaanMedia } from "../../src/services/queue/job-queue.js";

describe("AntreanPekerjaanMedia", () => {
  it("harus mengeksekusi pekerjaan dan mengembalikan hasil", async () => {
    const antrean = new AntreanPekerjaanMedia(2);

    const hasil = await antrean.antrekanPekerjaan("pekerjaan1", async () => {
      return "sukses";
    });

    expect(hasil).toBe("sukses");
  });

  it("harus membatasi konkurensi sesuai batas yang ditentukan", async () => {
    const antrean = new AntreanPekerjaanMedia(1);
    const urutan: number[] = [];

    const janji1 = antrean.antrekanPekerjaan("job1", async () => {
      await new Promise((r) => setTimeout(r, 50));
      urutan.push(1);
      return 1;
    });

    const janji2 = antrean.antrekanPekerjaan("job2", async () => {
      urutan.push(2);
      return 2;
    });

    await Promise.all([janji1, janji2]);

    expect(urutan).toEqual([1, 2]);
  });
});
