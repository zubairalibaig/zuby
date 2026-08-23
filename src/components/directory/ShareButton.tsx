"use client";

import { useState } from "react";
import { copy } from "@/lib/copy/en";

interface Props {
  kitchenName: string;
  path: string;
}

/**
 * "Share this kitchen" — WhatsApp-first, because that is how home-food
 * discovery actually spreads in Indian cities (a link forwarded into an
 * apartment group is worth more than a backlink, and is invisible to analytics
 * without this). The UTM tag is imperfect attribution, which still beats none.
 */
export function ShareButton({ kitchenName, path }: Props) {
  const [copied, setCopied] = useState(false);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://zuby.food";
  const shareUrl = `${siteUrl}${path}?utm_source=whatsapp&utm_medium=share&utm_campaign=chef_share`;
  const message = copy.share.message(kitchenName, shareUrl);

  async function nativeShare() {
    // Web Share API where it exists (all modern Android), clipboard otherwise.
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: kitchenName, text: message, url: shareUrl });
        return;
      } catch {
        // User dismissed the sheet — not an error worth surfacing.
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the WhatsApp link below still works */
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <a
        href={`https://wa.me/?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-4 py-2 text-sm font-medium text-sand-700 hover:border-[#25D366] hover:text-[#128C7E]"
      >
        {copy.share.whatsappCta}
      </a>
      <button
        type="button"
        onClick={nativeShare}
        className="inline-flex items-center gap-1.5 rounded-full border border-sand-300 px-4 py-2 text-sm font-medium text-sand-700 hover:border-zuby-400 hover:text-zuby-600"
      >
        {copied ? copy.share.copied : copy.share.otherCta}
      </button>
    </div>
  );
}
