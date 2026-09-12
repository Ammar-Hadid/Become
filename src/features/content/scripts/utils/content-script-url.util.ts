export function isScriptLinkAllowed(value: string) {
  if (!value || /[\u0000-\u0020\u007f]/.test(value)) return false;
  try {
    return ["https:", "http:", "mailto:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export function scriptImageUrl(id: string) {
  return `/api/content/scripts/images/${encodeURIComponent(id)}`;
}
