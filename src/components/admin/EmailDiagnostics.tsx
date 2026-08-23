"use client";

import { useState, useTransition } from "react";
import { sendTestEmail } from "@/lib/admin/actions";

/**
 * Verifies Resend setup end to end without touching a real listing — the
 * alternative is approving a live chef just to see whether email works.
 */
export function EmailDiagnostics({ configured }: { configured: boolean }) {
  const [msg, setMsg] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  function run() {
    setMsg(null);
    startTransition(async () => {
      const result = await sendTestEmail();
      setOk(result.ok);
      setMsg(result.ok ? (result.detail ?? "Sent.") : (result.error ?? "Failed"));
    });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Chef email</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {configured
              ? "Resend is configured. Approval, changes-requested and claim-decision emails will send."
              : "RESEND_API_KEY is not set — chef emails are skipped silently. See docs/resend-setup.md."}
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={isPending || !configured}
          className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {isPending ? "Sending…" : "Send test email"}
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-sm ${ok ? "text-green-700" : "text-red-600"}`}>{msg}</p>
      )}
    </div>
  );
}
