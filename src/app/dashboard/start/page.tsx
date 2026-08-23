import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireChefPage } from "@/lib/chef/auth";
import { getMyPendingClaims } from "@/lib/chef/queries";
import { copy } from "@/lib/copy/en";

export const metadata: Metadata = { title: "Get started — Zuby" };

export default async function DashboardStartPage() {
  const { supabase, chefId } = await requireChefPage();
  // If user already has a listing, go to the real dashboard.
  if (chefId) redirect("/dashboard");

  // A pending claim leaves the chef with no listing attached, so without this
  // they'd see the "find or create" chooser and reasonably assume their claim
  // vanished — then create a duplicate.
  const pendingClaims = await getMyPendingClaims(supabase);

  const c = copy.onboarding;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">{c.heading}</h1>
      <p className="mt-1 text-neutral-500">{c.subheading}</p>

      {pendingClaims.length > 0 && (
        <div className="mt-6 w-full rounded-xl border border-amber-200 bg-amber-50 p-4 text-left">
          <p className="font-semibold text-amber-900">{c.claimPendingHeading}</p>
          <ul className="mt-1.5 space-y-1 text-sm text-amber-800">
            {pendingClaims.map((claim) => (
              <li key={claim.id}>
                <strong>{claim.kitchenName}</strong> — {c.claimPendingBody}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/find"
          className="rounded-xl border-2 border-neutral-200 p-6 text-left hover:border-zuby-500 hover:shadow-sm transition-all"
        >
          <span className="text-2xl">🔍</span>
          <p className="mt-2 font-semibold text-neutral-900">{c.findKitchen}</p>
          <p className="mt-1 text-sm text-neutral-500">{c.findKitchenDesc}</p>
        </Link>
        <Link
          href="/dashboard/create"
          className="rounded-xl border-2 border-neutral-200 p-6 text-left hover:border-zuby-500 hover:shadow-sm transition-all"
        >
          <span className="text-2xl">🏠</span>
          <p className="mt-2 font-semibold text-neutral-900">{c.listKitchen}</p>
          <p className="mt-1 text-sm text-neutral-500">{c.listKitchenDesc}</p>
        </Link>
      </div>
    </main>
  );
}
