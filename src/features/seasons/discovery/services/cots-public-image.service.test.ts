import { describe, expect, it } from "vitest";
import {
  isPublicImageAddress,
  publicImageUrl,
} from "./cots-public-image.service";
describe("candidate-bound public image boundary", () => {
  it.each([
    "127.0.0.1",
    "0.0.0.0",
    "10.1.2.3",
    "172.16.1.1",
    "192.168.0.1",
    "169.254.169.254",
    "100.64.0.1",
    "198.18.0.1",
    "192.0.2.1",
    "198.51.100.1",
    "203.0.113.1",
    "224.1.2.3",
    "255.255.255.255",
    "::1",
    "::",
    "::ffff:127.0.0.1",
    "::ffff:7f00:1",
    "fc00::1",
    "fe80::1",
    "2001:db8::1",
    "2002:7f00:1::1",
  ])("blocks reserved or local address %s", (value) =>
    expect(isPublicImageAddress(value)).toBe(false),
  );
  it.each(["8.8.8.8", "104.16.1.1", "2606:4700::1111"])(
    "permits global address %s",
    (value) => expect(isPublicImageAddress(value)).toBe(true),
  );
  it.each([
    "http://example.com/a.jpg",
    "https://user:password@example.com/a.jpg",
    "https://example.com:8443/a.png",
    "file:///tmp/a.png",
    "https://127.1/a.jpg",
    "https://2130706433/a.jpg",
    "https://0x7f000001/a.jpg",
    "https://localhost/a.jpg",
    "https://internal.local/a.jpg",
  ])("rejects unsafe URL %s", (value) =>
    expect(() => publicImageUrl(value)).toThrow(),
  );
  it("keeps HTTPS rendition query and rejects embedded credentials", () =>
    expect(
      publicImageUrl("https://images.example.com/art.webp?w=900").href,
    ).toBe("https://images.example.com/art.webp?w=900"));
});
