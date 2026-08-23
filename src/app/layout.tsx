import type { Metadata } from "next";
import { copy } from "@/lib/copy/en";
import { JsonLd } from "@/components/directory/JsonLd";
import { organizationJsonLd, webSiteJsonLd } from "@/lib/seo/jsonld";
import { ServiceWorker } from "@/components/ServiceWorker";
import "./globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  metadataBase: new URL(SITE_URL),
  applicationName: "Zuby",
  appleWebApp: { capable: true, title: "Zuby", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export const viewport = {
  themeColor: "#e8590c",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans">
        {/* Site-wide entity graph — emitted once, not per page. See
            docs/discoverability-strategy.md §7. */}
        <JsonLd data={organizationJsonLd()} />
        <JsonLd data={webSiteJsonLd()} />
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
