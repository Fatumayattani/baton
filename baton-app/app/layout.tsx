import type { Metadata } from "next";
import "@fontsource/archivo/400.css";
import "@fontsource/archivo/600.css";
import "@fontsource/archivo/700.css";
import "@fontsource/archivo-black";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baton — Self custody that outlives you",
  description:
    "Place assets in a revocable onchain estate. Keep carrying the baton while you are active. If you go silent, the people you chose can claim without seed phrases.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-ink text-cream antialiased">{children}</body>
    </html>
  );
}
