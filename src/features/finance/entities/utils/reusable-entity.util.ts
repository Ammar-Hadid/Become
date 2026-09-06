export function normalizeReusableEntityName(name: string) {
  return name.trim().normalize("NFKC").toLocaleLowerCase("en");
}
