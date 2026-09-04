const TECHNOLOGY_SLUG_ALIASES: Record<string, string> = {
  js: "javascript",
  ts: "typescript",
  "react.js": "react",
  reactjs: "react",
  "react js": "react",
  "vue.js": "vue",
  vuejs: "vue",
  "vue js": "vue",
  "next.js": "next-js",
  nextjs: "next-js",
  "next js": "next-js",
  "node.js": "node-js",
  nodejs: "node-js",
  "node js": "node-js",
  postgres: "postgresql",
  mongo: "mongodb",
  tailwind: "tailwind-css",
  tailwindcss: "tailwind-css",
  csharp: "c-sharp",
  "c sharp": "c-sharp",
  cpp: "c-plus-plus",
  "c plus plus": "c-plus-plus",
};

export function toTechnologySlug(value: string) {
  const normalizedName = value.trim().toLowerCase().replaceAll(/\s+/g, " ");
  const aliased = TECHNOLOGY_SLUG_ALIASES[normalizedName];
  if (aliased) return aliased;

  return normalizedName
    .normalize("NFKD")
    .replaceAll("#", " sharp ")
    .replaceAll("+", " plus ")
    .replaceAll("&", " and ")
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-|-$/g, "")
    .slice(0, 80);
}
