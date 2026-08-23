"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setPromotion } from "@/lib/admin/actions";

interface Props {
  chefId: string;
  status: string;
  promotedUntil: string | null;
  promotedWeight: number;
}

/**
 * Sell and revoke paid placement. Time-boxed on purpose: a promotion with no
 * expiry becomes a permanent ranking advantage nobody remembers granting.
 */
export function PromotionPanel({ chefId, status, promotedUntil, promotedWeight }: Props) {
  const [days, setDays] = useState("30");
  const [weight, setWeight] = useState(String(promotedWeight || 0));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const active = promotedUntil !== null && new Date(promotedUntil) > new Date();
  const canPromote = status === "approved";

  function apply(nextDays: number) {
    setError(null);
    startTransition(async () => {
      const result = await setPromotion(chefId, nextDays, Number(weight) || 0);
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">Promoted placement</h2>

      {active ? (
        <p className="mt-1 text-sm text-green-700">
          Promoted until {new Date(promotedUntil!).toLocaleDateString()} · weight {promotedWeight}
        </p>
      ) : (
        <p className="mt-1 text-sm text-neutral-500">Not currently promoted.</p>
      )}

      {!canPromote && (
        <p className="mt-2 rounded bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Only an approved listing can be promoted — placement never bypasses verification.
        </p>
      )}

      <p className="mt-2 text-xs text-neutral-400">
        Featured kitchens carry a visible &ldquo;Promoted&rdquo; label on the home page, and are
        excluded from the trending rail so they aren&rsquo;t counted twice.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="text-xs text-neutral-500">
          Days
          <input
            type="number"
            min={1}
            value={days}
            onChange={(e) => setDays(e.target.value)}
            className="mt-1 block w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
          />
        </label>
        <label className="text-xs text-neutral-500">
          Weight
          <input
            type="number"
            min={0}
            max={100}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="mt-1 block w-20 rounded-md border border-neutral-300 px-2 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
          />
        </label>
        <button
          type="button"
          onClick={() => apply(Number(days) || 30)}
          disabled={isPending || !canPromote}
          className="rounded-md bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
        >
          {isPending ? "Saving…" : active ? "Extend / update" : "Promote"}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => apply(0)}
            disabled={isPending}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          >
            End promotion
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
