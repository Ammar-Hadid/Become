import { describe, expect, it } from "vitest";
import { soundForAreaChange } from "./area-sound.util";

describe("soundForAreaChange", () => {
  it("uses Horizon for major area entries and Gravity for a return to Dashboard", () => {
    expect(soundForAreaChange("/", "/finance")).toBe("areaEntered");
    expect(soundForAreaChange("/finance", "/engineering")).toBe("areaEntered");
    expect(soundForAreaChange("/engineering", "/")).toBe("returned");
  });

  it("keeps refreshes, nested pages, and unrelated routes silent", () => {
    expect(soundForAreaChange("/finance", "/finance")).toBeNull();
    expect(soundForAreaChange("/finance", "/finance/transactions")).toBeNull();
    expect(soundForAreaChange("/finance", "/settings")).toBeNull();
  });
});
