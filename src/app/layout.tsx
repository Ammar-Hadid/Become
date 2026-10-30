import type { Metadata } from "next";
import { geistMono, inter, manrope } from "./fonts/font.config";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Become", template: "%s · Become" },
  description:
    "A personal operating system for direction, evidence, and growth.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${manrope.variable} ${inter.variable} ${geistMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
