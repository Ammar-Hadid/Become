import { expect, it } from "vitest";
import { boundedExcerpt, measurePacket } from "./review-payload.util";
import { reviewFingerprint } from "./review-fingerprint.util";
it("keeps complete UTF-8 code points and measures its own byte field", () => {
  expect(boundedExcerpt("a🌿約", 5)).toBe("a🌿");
  expect(boundedExcerpt("🌿", 3)).toBe("");
  const packet = measurePacket({ text: "約🌿".repeat(20), payloadBytes: 0 });
  expect(packet.payloadBytes).toBe(Buffer.byteLength(JSON.stringify(packet)));
});
it("normalizes object order and exact integers without obscuring content changes", () => {
  expect(reviewFingerprint({ b: 1, a: 2n })).toBe(
    reviewFingerprint({ a: "2", b: 1 }),
  );
  expect(reviewFingerprint({ a: 3 })).not.toBe(reviewFingerprint({ a: 4 }));
});
