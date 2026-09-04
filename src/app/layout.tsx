import type { Metadata } from "next";
import "geist/font/sans";
import "geist/font/mono";
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
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
