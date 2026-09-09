export function toDomainSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function getDomainHref(slug: string) {
  return slug === "engineering" || slug === "finance" || slug === "entrepreneurship"
    ? `/${slug}`
    : `/domains/${slug}`;
}
