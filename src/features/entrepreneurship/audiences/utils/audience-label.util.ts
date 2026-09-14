export function marketTypeLabel(value?: string | null) {
  return value === "B2C"
    ? "Consumers"
    : value === "B2B"
      ? "Businesses"
      : value === "BOTH"
        ? "Consumers & businesses"
        : value === "UNKNOWN"
          ? "Not sure yet"
          : "Context not recorded";
}
