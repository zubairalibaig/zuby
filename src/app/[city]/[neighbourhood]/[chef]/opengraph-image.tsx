import { ImageResponse } from "next/og";
import { getChefBySlug } from "@/lib/supabase/queries";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ city: string; neighbourhood: string; chef: string }>;
}) {
  const { city, neighbourhood, chef: chefSlug } = await params;
  const chef = await getChefBySlug(city, neighbourhood, chefSlug);

  const title = chef?.kitchenName ?? "Zuby";
  const subtitle = chef
    ? `${chef.neighbourhoodName}, ${chef.cityName}`
    : "Home-cooked food near you";

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        background: "linear-gradient(135deg, #fff8f0 0%, #ffedd8 100%)",
        fontFamily: "sans-serif",
        padding: 64,
      }}
    >
      <div style={{ fontSize: 28, color: "#d9480f", fontWeight: 600 }}>Zuby</div>
      <div
        style={{ fontSize: 72, fontWeight: 700, color: "#5c2200", marginTop: 12, maxWidth: 1000 }}
      >
        {title}
      </div>
      <div style={{ fontSize: 34, color: "#7a4a2a", marginTop: 8 }}>{subtitle}</div>
      {chef?.isVerified && (
        <div style={{ fontSize: 28, color: "#e8590c", marginTop: 20, fontWeight: 600 }}>
          ✓ Verified by Zuby
        </div>
      )}
    </div>,
    { ...size },
  );
}
