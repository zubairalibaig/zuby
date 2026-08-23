import type { Metadata } from "next";
import { requireChefPage } from "@/lib/chef/auth";
import { getMyChef } from "@/lib/chef/queries";
import { copy } from "@/lib/copy/en";
import { DashboardPhotoManager } from "@/components/dashboard/PhotoManager";

export const metadata: Metadata = {
  title: `${copy.dashboard.nav.photos} — ${copy.dashboard.metaTitle}`,
};

export default async function DashboardPhotosPage() {
  const { supabase, chefId } = await requireChefPage();
  if (!chefId) return null;

  const chef = await getMyChef(supabase, chefId);
  if (!chef) return <p className="text-neutral-500">Listing not found.</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{copy.dashboard.photosHeading}</h1>
      <DashboardPhotoManager chefId={chef.id} photos={chef.photos} coverUrl={chef.photoUrl} />
    </div>
  );
}
