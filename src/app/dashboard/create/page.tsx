import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireChefPage } from "@/lib/chef/auth";
import { getRefData } from "@/lib/admin/queries";
import { copy } from "@/lib/copy/en";
import { CreateListingStepper } from "@/components/dashboard/CreateListingStepper";

export const metadata: Metadata = { title: copy.createListing.metaTitle };

export default async function CreateListingPage() {
  const { supabase, chefId } = await requireChefPage();

  // Already has a listing → go to dashboard.
  if (chefId) redirect("/dashboard");

  const refData = await getRefData(supabase);

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">{copy.createListing.heading}</h1>
      <CreateListingStepper refData={refData} />
    </main>
  );
}
