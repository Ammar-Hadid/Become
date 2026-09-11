import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request } from "node:https";
import { DirectionError } from "@/features/direction/services/direction-mutation.service";
import { SEASON_IMAGE_CONTENT_TYPES } from "@/features/seasons/media/constants/season-image.constants";
import { MAX_UPLOAD_BYTES } from "@/features/seasons/media/services/season-image.service";

export function isPublicImageAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a, b, c] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) !== 6) return false;
  const normalized = new URL(`https://[${address}]/`).hostname
    .slice(1, -1)
    .toLowerCase();
  // Only global unicast; exclude documentation, protocol assignments and embedded IPv4/tunnels.
  return (
    /^[23][0-9a-f]{3}:/.test(normalized) &&
    !normalized.startsWith("2001:") &&
    !normalized.startsWith("2002:") &&
    !normalized.startsWith("3fff:")
  );
}

export function publicImageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new DirectionError("This source has no usable image URL.");
  }
  if (
    url.protocol !== "https:" ||
    (url.port && url.port !== "443") ||
    url.username ||
    url.password ||
    value.length > 4000
  )
    throw new DirectionError("This image source cannot be downloaded safely.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (
    (isIP(host) && !isPublicImageAddress(host)) ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local")
  )
    throw new DirectionError("This image source is not a public address.");
  return url;
}

/** Only a server-resolved candidate may supply this URL. DNS is pinned per hop. */
export async function fetchPublicImage(
  value: string,
  maximum = MAX_UPLOAD_BYTES,
): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  try {
    let url = publicImageUrl(value);
    for (let redirects = 0; redirects <= 3; redirects++) {
      if (controller.signal.aborted)
        throw new DirectionError("The image source timed out.");
      const hostname = url.hostname.replace(/^\[|\]$/g, "");
      const addresses = await Promise.race([
        lookup(hostname, { all: true, verbatim: true }),
        new Promise<never>((_, reject) =>
          controller.signal.addEventListener(
            "abort",
            () => reject(new DirectionError("The image source timed out.")),
            { once: true },
          ),
        ),
      ]);
      if (
        !addresses.length ||
        addresses.some((v) => !isPublicImageAddress(v.address))
      )
        throw new DirectionError(
          "This image source resolved to an unsafe address.",
        );
      if (controller.signal.aborted)
        throw new DirectionError("The image source timed out.");
      const result = await new Promise<{ redirect?: string; bytes?: Buffer }>(
        (resolve, reject) => {
          const req = request(
            {
              hostname: addresses[0].address,
              port: 443,
              servername: hostname,
              path: `${url.pathname}${url.search}`,
              method: "GET",
              agent: false,
              rejectUnauthorized: true,
              signal: controller.signal,
              headers: {
                Host: url.host,
                "User-Agent": "Become/1.0 (personal image curation)",
                Accept: [...SEASON_IMAGE_CONTENT_TYPES].join(","),
              },
            },
            (response) => {
              const status = response.statusCode ?? 0;
              if ([301, 302, 303, 307, 308].includes(status)) {
                const location = response.headers.location;
                response.destroy();
                if (!location)
                  reject(
                    new DirectionError(
                      "The image source redirected without a destination.",
                    ),
                  );
                else resolve({ redirect: location });
                return;
              }
              const contentType = (response.headers["content-type"] ?? "")
                .split(";", 1)[0]
                .trim()
                .toLowerCase();
              if (
                status !== 200 ||
                !SEASON_IMAGE_CONTENT_TYPES.has(contentType)
              ) {
                response.destroy();
                reject(
                  new DirectionError(
                    "This source did not return an accessible still image.",
                  ),
                );
                return;
              }
              if (Number(response.headers["content-length"] ?? 0) > maximum) {
                response.destroy();
                reject(
                  new DirectionError(
                    "This rendition is too large. Choose a smaller image.",
                  ),
                );
                return;
              }
              const chunks: Buffer[] = [];
              let size = 0;
              response.on("data", (chunk: Buffer) => {
                size += chunk.length;
                if (size > maximum) {
                  response.destroy();
                  reject(new DirectionError("This rendition is too large."));
                } else chunks.push(chunk);
              });
              response.on("end", () =>
                resolve({ bytes: Buffer.concat(chunks) }),
              );
              response.on("error", () =>
                reject(
                  new DirectionError("The image download was interrupted."),
                ),
              );
            },
          );
          req.on("error", () =>
            reject(
              new DirectionError(
                "This image source is unavailable. Try another source or rendition.",
              ),
            ),
          );
          req.end();
        },
      );
      if (result.bytes) return result.bytes;
      url = publicImageUrl(new URL(result.redirect!, url).href);
    }
    throw new DirectionError("This image source redirected too many times.");
  } finally {
    clearTimeout(timeout);
  }
}
