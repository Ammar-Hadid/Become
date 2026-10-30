// Deliberately limited to the three researched source families. This is not a web crawler.
const hosts = new Set([
  "shingeki.tv",
  "kaoruhana-anime.com",
  "kadokawa-animation.jp",
  "www.b-ch.com",
  "image2.b-ch.com",
  "graphql.anilist.co",
]);
export function validateOfficialUrl(value: string) {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    !hosts.has(url.hostname)
  )
    throw new Error("Unreviewed source URL");
  return url;
}
export function extractImageUrls(text: string, pageUrl: string, kind = "html") {
  const images = new Set<string>();
  const add = (value: string) => {
    try {
      images.add(
        validateOfficialUrl(
          new URL(value.replaceAll("&amp;", "&"), pageUrl).href,
        ).href,
      );
    } catch {
      /* Unknown hosts and HTTP are not eligible. */
    }
  };
  if (kind === "bandai-episodes") {
    const rows: unknown = JSON.parse(text);
    if (!Array.isArray(rows)) throw new Error("Unexpected episode metadata");
    for (const row of rows) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      if (
        (item.make_fr_y != null && Number(item.make_fr_y) !== 2011) ||
        !Number.isInteger(item.stry_sq) ||
        typeof item.thumnail1file_txt !== "string" ||
        !/^2985\d{3}[a-z]\.jpg$/.test(item.thumnail1file_txt)
      )
        continue;
      add(`https://image2.b-ch.com/ttl2/2985/${item.thumnail1file_txt}`);
    }
  } else {
    // Only extract attributes from known source markup; never execute fetched scripts.
    const html = text.replace(
      /<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>/gi,
      "",
    );
    for (const match of html.matchAll(
      /<(?:img|source)\b(?:"[^"]*"|'[^']*'|[^'">])*?>/gi,
    )) {
      const attributes = new Map(
        [...match[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(
          (row) => [row[1].toLowerCase(), row[2] ?? row[3]],
        ),
      );
      const original =
        attributes.get("data-original") || attributes.get("data-src");
      if (original) add(original);
      else if (attributes.get("srcset"))
        for (const item of attributes.get("srcset")!.split(","))
          add(item.trim().split(/\s+/)[0]);
      else if (attributes.get("src")) add(attributes.get("src")!);
    }
  }
  return [...images];
}
