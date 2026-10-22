import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Pebble — a small AI companion for your Mac", template: "%s · Pebble" },
  description:
    "Pebble is a free, open-source AI companion for Macs with Apple silicon. Chat with the model you choose; you decide what it may change.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F9F6" },
    { media: "(prefers-color-scheme: dark)", color: "#191E1B" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
