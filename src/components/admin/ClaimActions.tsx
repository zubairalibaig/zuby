"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { decideClaim } from "@/lib/admin/actions";

export function ClaimActions({ claimId }: { claimId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function decide(approve: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await decideClaim(claimId, approve, note);
      if (!res.ok) setError(res.error ?? "Failed");
      else router.refresh();
    });
  }

  return (
    <div className="mt-2">
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Note (e.g. number matches / doesn't match)"
        className="mb-2 w-full rounded-md border border-neutral-300 px-2 py-1 text-xs"
      />
      {error && <p className="mb-1 text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => decide(true)}
          className="rounded-md bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          Approve claim
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide(false)}
          className="rounded-md border border-red-300 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
