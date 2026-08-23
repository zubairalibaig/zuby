import type { Metadata } from "next";
import { requireChefPage } from "@/lib/chef/auth";
import { getMyChef } from "@/lib/chef/queries";
import { getRefData } from "@/lib/admin/queries";
import { copy } from "@/lib/copy/en";
import { DashboardProfileEditor } from "@/components/dashboard/ProfileEditor";

export const metadata: Metadata = {
  title: `${copy.dashboard.nav.profile} — ${copy.dashboard.metaTitle}`,
};

export default async function DashboardProfilePage() {
  const { supabase, chefId } = await requireChefPage();
  if (!chefId) return null;

  const [chef, refData] = await Promise.all([getMyChef(supabase, chefId), getRefData(supabase)]);
  if (!chef) return <p className="text-neutral-500">Listing not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{copy.dashboard.profileHeading}</h1>
      <DashboardProfileEditor chef={chef} refData={refData} />
    </div>
  );
}
