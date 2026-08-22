"use client";

import { useCallback } from "react";
import { cn } from "@/lib/utils";
import { copy } from "@/lib/copy/en";
import { geohashEncode } from "@/lib/geo/geohash";

interface WhatsAppButtonProps {
  chefId: string;
  className?: string;
  sticky?: boolean;
}

/**
 * Always a real <a href="/api/wa/[chefId]"> — works with JS disabled, and
 * never embeds a phone number client-side (the number only ever resolves
 * server-side inside that route). When the browser already holds geolocation
 * permission we quietly attach an approximate geohash so the click can be
 * attributed to a neighbourhood — we never prompt for permission on click,
 * since a permission dialog right before a redirect is a bad experience.
 */
export function WhatsAppButton({ chefId, className, sticky }: WhatsAppButtonProps) {
  const href = `/api/wa/${chefId}`;

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof navigator === "undefined" || !navigator.geolocation || !navigator.permissions) {
        return; // no enhancement possible — let the plain href navigate
      }
      // Only ever read a position we already have permission for.
      navigator.permissions
        .query({ name: "geolocation" })
        .then((status) => {
          if (status.state !== "granted") return;
          event.preventDefault();
          const timeout = window.setTimeout(() => {
            window.location.href = href;
          }, 600);
          navigator.geolocation.getCurrentPosition(
            (position) => {
              window.clearTimeout(timeout);
              const g = geohashEncode(position.coords.latitude, position.coords.longitude, 5);
              window.location.href = `${href}?g=${g}`;
            },
            () => {
              window.clearTimeout(timeout);
              window.location.href = href;
            },
            { timeout: 500, maximumAge: 5 * 60 * 1000 },
          );
        })
        .catch(() => {
          /* permissions API not fully supported — plain href already navigating */
        });
    },
    [href],
  );

  return (
    <a
      href={href}
      onClick={handleClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-[#1fb958] active:scale-[0.98]",
        sticky && "fixed inset-x-4 bottom-4 z-40 shadow-lg sm:hidden",
        className,
      )}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5" aria-hidden="true">
        <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.29-1.39a9.9 9.9 0 004.75 1.21h.01c5.46 0 9.9-4.45 9.9-9.91C21.95 6.45 17.5 2 12.04 2zm5.78 14.08c-.24.68-1.4 1.3-1.93 1.38-.5.08-1.11.11-1.79-.11-.41-.13-.94-.3-1.62-.6-2.85-1.23-4.71-4.1-4.85-4.29-.14-.19-1.16-1.54-1.16-2.94s.73-2.09.99-2.38c.26-.28.57-.35.76-.35h.55c.18 0 .41-.02.64.49.24.55.81 1.9.88 2.04.07.14.11.3.02.49-.09.19-.14.3-.28.46-.14.16-.29.36-.42.48-.14.13-.28.28-.12.55.16.28.71 1.17 1.52 1.9 1.05.94 1.93 1.23 2.21 1.37.28.14.44.12.6-.07.16-.19.68-.79.87-1.06.18-.28.37-.23.62-.14.26.09 1.63.77 1.91.91.28.14.46.21.53.33.07.12.07.68-.17 1.35z" />
      </svg>
      {copy.chef.orderCta}
    </a>
  );
}
