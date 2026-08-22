"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/copy/en";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * "~2.3 km away" — only ever computed client-side from the buyer's own
 * browser, and only when geolocation permission is already granted (never
 * prompts on a profile view). Silent no-render otherwise.
 */
export function ChefDistance({ lat, lng }: { lat: number; lng: number }) {
  const [km, setKm] = useState<number | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.permissions)
      return;
    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (status.state !== "granted") return;
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setKm(haversineKm(position.coords.latitude, position.coords.longitude, lat, lng));
          },
          () => undefined,
          { timeout: 3000, maximumAge: 5 * 60 * 1000 },
        );
      })
      .catch(() => undefined);
  }, [lat, lng]);

  if (km === null) return null;
  return <span>{copy.chef.distanceAway(Math.round(km * 10) / 10)}</span>;
}
