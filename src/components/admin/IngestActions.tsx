"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { promoteCandidate, discardCandidate } from "@/lib/admin/actions";

export function IngestActions({ candidateId, status }: { candidateId: string; status: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status === "promoted") {
    return <p className="text-sm text-green-700">Already promoted.</p>;
  }
  if (status === "discarded") {
    return <p className="text-sm text-neutral-500">Discarded.</p>;
  }

  return (
    <div>
      {error && <p className="mb-2 text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await promoteCandidate(candidateId);
              if (!res.ok) setError(res.error ?? "Failed");
              else if (res.chefId) router.push(`/admin/chefs/${res.chefId}`);
              else router.refresh();
            })
          }
          className="rounded-md bg-zuby-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
        >
          Promote to pending review
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const res = await discardCandidate(candidateId);
              if (!res.ok) setError(res.error ?? "Failed");
              else router.refresh();
            })
          }
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}
