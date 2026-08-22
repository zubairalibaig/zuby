import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listClaims } from "@/lib/admin/queries";
import { ClaimActions } from "@/components/admin/ClaimActions";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  const { supabase } = await requireAdminPage();
  const claims = await listClaims(supabase, "pending");

  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900">Claims inbox</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Chefs claiming their listing (Phase 4). For a WhatsApp self-verification claim, check that
        the code in the note arrived in a WhatsApp message from the listing’s own number, then
        approve.
      </p>

      {claims.length === 0 ? (
        <p className="mt-8 rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          No pending claims.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {claims.map((c) => (
            <div key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Link
                    href={`/admin/chefs/${c.chefId}`}
                    className="font-medium text-zuby-600 hover:underline"
                  >
                    {c.chefKitchenName}
                  </Link>
                  <p className="text-xs text-neutral-400">
                    Listing WhatsApp: {c.chefWhatsapp ?? "—"} · Claimant phone:{" "}
                    {c.claimantPhone ?? "—"}
                  </p>
                  {c.proofNote && <p className="mt-1 text-sm text-neutral-600">{c.proofNote}</p>}
                </div>
                <span className="text-xs text-neutral-400">
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
              <ClaimActions claimId={c.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
