"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitWhatsAppClaim } from "@/lib/chef/actions";
import { copy } from "@/lib/copy/en";

interface Props {
  chefId: string;
  code: string;
  waHref: string;
}

/**
 * Records the claim first, then opens the wa.me link. Order matters: the admin
 * needs the claim row (carrying the code) waiting in the inbox before the
 * chef's WhatsApp message arrives, otherwise there is nothing to match it to.
 */
export function WhatsAppVerifyButton({ chefId, code, waHref }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const c = copy.claim;

  function start() {
    setError(null);
    startTransition(async () => {
      const result = await submitWhatsAppClaim(chefId, code);
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      setSent(true);
      window.open(waHref, "_blank", "noopener,noreferrer");
      router.refresh();
    });
  }

  if (sent) {
    return (
      <div className="rounded-lg bg-green-50 p-3 text-center">
        <p className="text-sm font-medium text-green-800">{c.whatsappSent}</p>
        <button
          type="button"
          onClick={() => window.open(waHref, "_blank", "noopener,noreferrer")}
          className="mt-1 text-xs text-green-700 underline"
        >
          {c.whatsappReopen}
        </button>
      </div>
    );
  }

  return (
    <>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="button"
        onClick={start}
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-lg bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1fb958] disabled:opacity-50"
      >
        {isPending ? "Opening…" : c.whatsappVerifyCta}
      </button>
    </>
  );
}
