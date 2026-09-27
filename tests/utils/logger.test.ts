import { describe, it, expect } from "vitest";
import { buatPencatat } from "../../src/utils/logger.js";

describe("Pencatat (Logger)", () => {
  it("harus dapat membuat instance pencatat dengan nama komponen", () => {
    const pencatat = buatPencatat("ModulUji");
    expect(pencatat).toBeDefined();
    expect(typeof pencatat.info).toBe("function");
    expect(typeof pencatat.error).toBe("function");
    expect(typeof pencatat.warn).toBe("function");
  });

  it("harus dapat membuat instance pencatat tanpa nama komponen", () => {
    const pencatat = buatPencatat();
    expect(pencatat).toBeDefined();
    expect(typeof pencatat.debug).toBe("function");
  });
});
