import type { Metadata } from "next";
import { copy } from "@/lib/copy/en";
import "./globals.css";

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  metadataBase: new URL("https://zuby.food"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
