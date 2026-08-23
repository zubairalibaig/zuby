import type { Metadata } from "next";
import { requireChefPage } from "@/lib/chef/auth";
import { getMyChef } from "@/lib/chef/queries";
import { copy } from "@/lib/copy/en";
import { DashboardMenuEditor } from "@/components/dashboard/MenuEditor";

export const metadata: Metadata = {
  title: `${copy.dashboard.nav.menu} — ${copy.dashboard.metaTitle}`,
};

export default async function DashboardMenuPage() {
  const { supabase, chefId } = await requireChefPage();
  if (!chefId) return null;

  const chef = await getMyChef(supabase, chefId);
  if (!chef) return <p className="text-neutral-500">Listing not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{copy.dashboard.menuHeading}</h1>
      <DashboardMenuEditor
        chefId={chef.id}
        currencyCode={chef.currencyCode}
        menuItems={chef.menuItems}
      />
    </div>
  );
}
