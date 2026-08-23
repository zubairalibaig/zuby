import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireChefPage } from "@/lib/chef/auth";
import { getMyChef } from "@/lib/chef/queries";
import { getRefData } from "@/lib/admin/queries";
import { copy } from "@/lib/copy/en";
import { CreateListingStepper } from "@/components/dashboard/CreateListingStepper";

export const metadata: Metadata = { title: copy.createListing.metaTitle };

export default async function CreateListingPage() {
  const { supabase, chefId } = await requireChefPage();

  // A draft is resumable — the chef abandoned the stepper part-way and came
  // back. Anything past draft has left the stepper for good, so send those to
  // the dashboard instead of letting them re-run onboarding.
  const existing = chefId ? await getMyChef(supabase, chefId) : null;
  if (existing && existing.status !== "draft") redirect("/dashboard");

  const refData = await getRefData(supabase);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">{copy.createListing.heading}</h1>
      {existing && (
        <p className="mt-1 text-sm text-neutral-500">{copy.createListing.resuming}</p>
      )}
      <CreateListingStepper refData={refData} draft={existing} />
    </main>
  );
}
