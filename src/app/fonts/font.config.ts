import localFont from "next/font/local";

export const manrope = localFont({
  src: "./manrope-variable.woff2",
  variable: "--font-manrope",
  display: "swap",
  weight: "200 800",
  adjustFontFallback: false,
});

export const inter = localFont({
  src: "./inter-variable.woff2",
  variable: "--font-inter",
  display: "swap",
  weight: "100 900",
  adjustFontFallback: false,
});

export const geistMono = localFont({
  src: "./geist-mono-variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
  adjustFontFallback: false,
});
