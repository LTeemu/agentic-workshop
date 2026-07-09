import { describe, it, expect } from "vitest";

describe("Spectra Glass Site", () => {
  it("imports main module without error", async () => {
    await expect(import("../main")).resolves.toBeDefined();
  });
});
