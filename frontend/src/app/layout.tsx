import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "PMForge: build proof, not notes",
  description: "A 120-day program that takes working IT project managers from delivery basics to AI-enabled IT programs.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#000000" };

// The nonce-based CSP (src/proxy.ts) needs every page rendered per request, so framework scripts get a nonce.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
