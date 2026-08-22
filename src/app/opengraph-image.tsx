import { ImageResponse } from "next/og";
import { copy } from "@/lib/copy/en";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fff8f0 0%, #ffedd8 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ fontSize: 96, fontWeight: 700, color: "#5c2200" }}>{copy.siteName}</div>
      <div style={{ fontSize: 36, color: "#d9480f", marginTop: 16 }}>{copy.tagline}</div>
    </div>,
    { ...size },
  );
}
