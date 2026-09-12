import { EventEmitter } from "node:events";
import type { IncomingMessage } from "node:http";
import { lookup } from "node:dns/promises";
import { request, type RequestOptions } from "node:https";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchPublicImage } from "./cots-public-image.service";
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("node:https", () => ({ request: vi.fn() }));
afterEach(() => vi.resetAllMocks());
function respond(
  status: number,
  headers: Record<string, string>,
  chunks: string[] = [],
) {
  const handler = (
    _: RequestOptions,
    callback: (response: IncomingMessage) => void,
  ) => {
    const req = new EventEmitter() as EventEmitter & { end: () => void };
    req.end = () => {
      const response = Object.assign(new EventEmitter(), {
        statusCode: status,
        headers,
        destroy: vi.fn(),
      });
      callback(response as unknown as IncomingMessage);
      for (const chunk of chunks) response.emit("data", Buffer.from(chunk));
      response.emit("end");
    };
    return req;
  };
  vi.mocked(request).mockImplementationOnce(
    handler as unknown as typeof request,
  );
}
function publicDns() {
  vi.mocked(lookup).mockResolvedValue([
    { address: "8.8.8.8", family: 4 },
  ] as never);
}
describe("public image HTTP security boundary", () => {
  it("rejects mixed public/private DNS answers before sending a request", async () => {
    vi.mocked(lookup).mockResolvedValue([
      { address: "8.8.8.8", family: 4 },
      { address: "127.0.0.1", family: 4 },
    ] as never);
    await expect(
      fetchPublicImage("https://images.example.com/a.png"),
    ).rejects.toThrow("unsafe address");
    expect(request).not.toHaveBeenCalled();
  });
  it("pins the public IP while preserving original hostname TLS validation", async () => {
    publicDns();
    respond(200, { "content-type": "image/png" }, ["fixture"]);
    expect(
      await fetchPublicImage("https://images.example.com/a.png?size=100"),
    ).toEqual(Buffer.from("fixture"));
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        hostname: "8.8.8.8",
        servername: "images.example.com",
        rejectUnauthorized: true,
        path: "/a.png?size=100",
        agent: false,
      }),
      expect.any(Function),
    );
  });
  it("accepts AVIF thumbnails returned by discovery providers", async () => {
    publicDns();
    respond(200, { "content-type": "image/avif" }, ["fixture"]);
    expect(await fetchPublicImage("https://images.example.com/a.avif")).toEqual(
      Buffer.from("fixture"),
    );
    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: expect.stringContaining("image/avif"),
        }),
      }),
      expect.any(Function),
    );
  });
  it("blocks redirect destinations on private addresses", async () => {
    publicDns();
    respond(302, { location: "https://169.254.169.254/latest/meta-data/" });
    await expect(
      fetchPublicImage("https://images.example.com/a.png"),
    ).rejects.toThrow("public address");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("revalidates DNS after a redirect instead of following a rebinding hostname", async () => {
    vi.mocked(lookup)
      .mockResolvedValueOnce([{ address: "8.8.8.8", family: 4 }] as never)
      .mockResolvedValueOnce([{ address: "10.0.0.1", family: 4 }] as never);
    respond(302, { location: "/next.png" });
    await expect(
      fetchPublicImage("https://images.example.com/a.png"),
    ).rejects.toThrow("unsafe address");
    expect(request).toHaveBeenCalledTimes(1);
  });
  it("bounds streaming responses even without Content-Length", async () => {
    publicDns();
    respond(200, { "content-type": "image/png" }, ["1234", "5678"]);
    await expect(
      fetchPublicImage("https://images.example.com/a.png", 6),
    ).rejects.toThrow("too large");
  });
  it("refuses active document content returned at an image URL", async () => {
    publicDns();
    respond(200, { "content-type": "image/svg+xml" }, ["<svg/>"]);
    await expect(
      fetchPublicImage("https://images.example.com/a.png"),
    ).rejects.toThrow("still image");
  });
  it("turns a blocked remote download into actionable guidance", async () => {
    publicDns();
    respond(403, { "content-type": "text/html" });
    await expect(
      fetchPublicImage("https://images.example.com/blocked.jpg"),
    ).rejects.toThrow("Remove it and choose another image");
  });
});
