"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { applyPendingEdits, discardPendingEdits } from "@/lib/admin/actions";
import type { AdminChefDetail } from "@/lib/admin/queries";

/**
 * Side-by-side diff of a chef's queued trust-field edits against the values the
 * public page is currently serving (Phase 4 pending-edits pattern; the diff view
 * Phase 3 deferred to here). Approving calls admin_apply_pending_edits, which is
 * the only moment the live row changes.
 */

interface Props {
  chef: AdminChefDetail;
}

/** pending_edits keys → the AdminChefDetail field holding the live value. */
const FIELD_LABELS: Record<string, string> = {
  display_name: "Chef name",
  fssai_number: "FSSAI number",
  address_text: "Full address",
  phone_e164: "Phone",
  whatsapp_e164: "WhatsApp",
  location_lat: "Latitude",
  location_lng: "Longitude",
};

function liveValue(chef: AdminChefDetail, key: string): string | null {
  switch (key) {
    case "display_name":
      return chef.displayName;
    case "fssai_number":
      return chef.fssaiNumber;
    case "address_text":
      return chef.addressText;
    case "phone_e164":
      return chef.phoneE164;
    case "whatsapp_e164":
      return chef.whatsappE164;
    case "location_lat":
      return chef.lat === null ? null : String(chef.lat);
    case "location_lng":
      return chef.lng === null ? null : String(chef.lng);
    default:
      return null;
  }
}

export function PendingEditsPanel({ chef }: Props) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const edits = chef.pendingEdits;
  if (!edits || typeof edits !== "object" || Array.isArray(edits)) return null;

  const entries = Object.entries(edits as Record<string, unknown>).filter(
    ([key]) => key in FIELD_LABELS,
  );
  if (entries.length === 0) return null;

  const fssaiChanged = entries.some(([k]) => k === "fssai_number");

  function run(fn: (chefId: string, note: string) => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await fn(chef.id, note);
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      setNote("");
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
      <h2 className="font-semibold text-amber-900">Pending edits from the chef</h2>
      <p className="mt-1 text-sm text-amber-800">
        The public page is still serving the current values. Nothing changes until you approve.
      </p>

      <table className="mt-3 w-full border-collapse text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-amber-700">
            <th className="py-1 pr-3 font-medium">Field</th>
            <th className="py-1 pr-3 font-medium">Currently live</th>
            <th className="py-1 font-medium">Proposed</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value]) => {
            const current = liveValue(chef, key);
            const proposed = value === null ? null : String(value);
            const unchanged = current === proposed;
            return (
              <tr key={key} className="border-t border-amber-200 align-top">
                <td className="py-2 pr-3 font-medium text-neutral-700">
                  {FIELD_LABELS[key]}
                </td>
                <td className="py-2 pr-3 text-neutral-500 line-through decoration-neutral-400">
                  {current ?? "—"}
                </td>
                <td
                  className={`py-2 font-medium ${
                    unchanged ? "text-neutral-400" : "text-green-700"
                  }`}
                >
                  {proposed ?? "—"}
                  {unchanged && <span className="ml-1 text-xs font-normal">(no change)</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {fssaiChanged && (
        <p className="mt-3 rounded bg-amber-100 px-3 py-2 text-xs text-amber-900">
          FSSAI number is changing — approving clears the existing FSSAI verification. Re-verify
          the new number after applying.
        </p>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Note for the audit trail (optional)"
        className="mt-3 block w-full rounded-md border border-amber-300 bg-white px-3 py-2 text-sm focus:border-amber-500 focus:outline-none"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => run(applyPendingEdits)}
          disabled={isPending}
          className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isPending ? "Working…" : "Approve edits"}
        </button>
        <button
          type="button"
          onClick={() => run(discardPendingEdits)}
          disabled={isPending}
          className="rounded-md border border-amber-400 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
        >
          Reject edits
        </button>
      </div>
    </div>
  );
}
