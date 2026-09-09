import { expect, it } from "vitest";
import { goalFunding, savingsPool } from "./savings.util";
it("distinguishes unconfigured, zero and unknown position", () => {
  expect(savingsPool(0n, null, 0n).configured).toBe(false);
  expect(savingsPool(0n, 0n, 0n).configured).toBe(true);
  expect(savingsPool(null, 300n, 100n).unallocated).toBeNull();
});
it("absorbs expense in unallocated capacity before surfacing underfunding", () => {
  expect(savingsPool(6000n, 3000n, 2200n).unallocated).toBe(800n);
  expect(savingsPool(5500n, 3000n, 2200n).unallocated).toBe(300n);
  expect(savingsPool(4900n, 3000n, 2200n)).toMatchObject({
    underfunding: 300n,
    allocated: 2200n,
  });
  expect(savingsPool(-10n, 3000n, 100n).reserveShortfall).toBe(3000n);
  expect(savingsPool(3000n, 3000n, 0n).aboveReserve).toBe(0n);
});
it("keeps target, spending and intent separate", () => {
  expect(goalFunding(2500n, 500n, 1400n)).toMatchObject({
    target: 2500n,
    remaining: 2000n,
    gap: 600n,
    overAllocated: 0n,
  });
  expect(goalFunding(2500n, 2300n, 500n).overAllocated).toBe(300n);
});
