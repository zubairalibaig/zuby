import type { Metadata } from "next";
import { requireChefPage } from "@/lib/chef/auth";
import { getMyChef } from "@/lib/chef/queries";
import { parseTimings } from "@/types/schemas";
import { copy } from "@/lib/copy/en";
import { DashboardTimingsEditor } from "@/components/dashboard/TimingsEditor";

export const metadata: Metadata = { title: `${copy.dashboard.nav.timings} — ${copy.dashboard.metaTitle}` };

export default async function DashboardTimingsPage() {
  const { supabase, chefId } = await requireChefPage();
  if (!chefId) return null;

  const chef = await getMyChef(supabase, chefId);
  if (!chef) return <p className="text-neutral-500">Listing not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{copy.dashboard.timingsHeading}</h1>
      <DashboardTimingsEditor chefId={chef.id} timings={parseTimings(chef.timings)} />
    </div>
  );
}
