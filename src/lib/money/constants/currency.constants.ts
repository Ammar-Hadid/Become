export const SUPPORTED_CURRENCIES = [
  { code: "EUR", name: "Euro" },
  { code: "USD", name: "US dollar" },
  { code: "GBP", name: "British pound" },
  { code: "CAD", name: "Canadian dollar" },
  { code: "JPY", name: "Japanese yen" },
] as const;

export const DEFAULT_CURRENCY = "EUR";
export const UNSUPPORTED_CURRENCY_MESSAGE =
  "Choose a supported currency: EUR, USD, GBP, CAD, or JPY.";
