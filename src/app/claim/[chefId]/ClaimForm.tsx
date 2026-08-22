"use client";

import { useState, useTransition } from "react";
import { submitClaim } from "@/lib/chef/actions";
import { copy } from "@/lib/copy/en";

interface Props {
  chefId: string;
}

export function ClaimForm({ chefId }: Props) {
  const [proofNote, setProofNote] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  const c = copy.claim;

  function handleSubmit() {
    if (!proofNote.trim()) {
      setError("Please describe how we can verify you.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await submitClaim(chefId, {
        proofNote: proofNote.trim(),
        claimantPhone: phone || null,
      });
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <div className="mt-4 rounded-lg bg-green-50 p-4 text-center">
        <p className="text-sm font-medium text-green-800">{c.claimSubmitted}</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <div>
        <label className="block text-sm font-medium text-neutral-700">{c.proofLabel}</label>
        <textarea
          value={proofNote}
          onChange={(e) => setProofNote(e.target.value)}
          placeholder={c.proofPlaceholder}
          rows={3}
          className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">
          Your phone number (optional)
        </label>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+91 99000 00001"
          className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending}
        className="w-full rounded-lg bg-zuby-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : c.submitClaim}
      </button>
    </div>
  );
}
