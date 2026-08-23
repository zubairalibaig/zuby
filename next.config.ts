import type { NextConfig } from "next";

/**
 * Security headers.
 *
 * The site has three authenticated surfaces (/admin, /dashboard, /claim) and
 * none of them were frame-protected, so any page could iframe the admin panel
 * and clickjack an approve or a suspend. `frame-ancestors 'none'` is the modern
 * control; X-Frame-Options is kept for older agents.
 *
 * A full CSP is deliberately not set here: Next injects inline scripts and
 * styles, so a correct policy needs per-request nonces, and a broken CSP fails
 * closed on a live site. Frame protection, MIME sniffing and referrer leakage
 * are the parts that can be fixed safely without that machinery.
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No geolocation for embedded third parties; the site itself still prompts.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), payment=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/**",
      },
    ],
    // Default is 60 seconds — meaning Vercel's image-optimization cache would
    // re-fetch every one of these from Supabase (counting against its free-
    // tier egress) roughly once a minute under any real traffic. Every photo
    // URL is a uuid path that's never overwritten (src/lib/media/resizeImage.ts,
    // upsert:false everywhere it's uploaded), so a year-long cache is exactly
    // as safe as the matching Storage-side Cache-Control set on upload — see
    // docs/cost-controls.md.
    minimumCacheTTL: 31536000,
    // Each distinct width Next requests is a separate billable transformation
    // against Vercel's image-optimization quota. The largest any image is
    // actually displayed at on this site is 200px (`sizes` props are all
    // 64/112/200px), so ~600px covers a 3x phone screen and the stock ceilings
    // of 384/3840 would only ever produce upscaled variants of a source image
    // that is itself capped at 1000px. Trimmed to what the UI can use, with a
    // little headroom; widen these if a full-bleed image is ever introduced.
    imageSizes: [64, 96, 128, 256, 384],
    deviceSizes: [640, 828, 1080],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
