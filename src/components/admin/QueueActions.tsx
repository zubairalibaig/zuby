"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setChefStatus, requestInfo, verifyFssai, type ActionResult } from "@/lib/admin/actions";

/**
 * The verification-queue action bar. Every state change carries a note (some
 * required) and writes verification_log server-side. Live chefs also get
 * suspend/delist here.
 */
export function QueueActions({
  chefId,
  status,
  fssaiNumber,
  fssaiVerified,
}: {
  chefId: string;
  status: string;
  fssaiNumber: string | null;
  fssaiVerified: boolean;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setError(res.error ?? "Failed");
      else {
        setNote("");
        router.refresh();
      }
    });
  }

  const isLive = status === "approved";

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (required for reject / request info; recorded in the audit log)"
        rows={2}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none focus:ring-1 focus:ring-zuby-500"
      />
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        {/* These three are review-stage actions — they stopped applying the
            moment the listing went live, but rendered unconditionally
            regardless of status: an already-approved chef showed "Approve &
            publish" / "Request info" / "Reject" right alongside Suspend and
            Delist, which read as if approval hadn't taken effect. Gated to
            everything except the live state, matching Suspend/Delist's own
            isLive check below — this also means an admin can re-approve a
            rejected/suspended/delisted listing straight from here, which is
            the one case worth keeping "Approve" around for outside review. */}
        {!isLive && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setChefStatus(chefId, "approved", note))}
              className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              Approve &amp; publish
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => requestInfo(chefId, note))}
              className="rounded-md border border-amber-400 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
            >
              Request info
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setChefStatus(chefId, "rejected", note))}
              className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {isLive && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setChefStatus(chefId, "suspended", note))}
              className="rounded-md border border-orange-300 px-3 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50 disabled:opacity-50"
            >
              Suspend
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => setChefStatus(chefId, "delisted", note))}
              className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
            >
              Delist
            </button>
          </>
        )}
      </div>

      {fssaiNumber && !fssaiVerified && (
        <div className="mt-3 border-t border-neutral-100 pt-3">
          <p className="text-xs text-neutral-500">
            FSSAI {fssaiNumber} — visually check the 14-digit format, then:
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => verifyFssai(chefId, note))}
            className="mt-1 rounded-md border border-zuby-500 px-3 py-1.5 text-sm font-medium text-zuby-600 hover:bg-zuby-50 disabled:opacity-50"
          >
            Mark FSSAI verified
          </button>
        </div>
      )}
      {fssaiVerified && <p className="mt-3 text-xs text-green-700">✓ FSSAI verified</p>}
    </div>
  );
}
