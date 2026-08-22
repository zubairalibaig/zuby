import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getAdminChef, getChefProvenance } from "@/lib/admin/queries";
import { ChefDetailView } from "@/components/admin/ChefDetailView";
import { QueueActions } from "@/components/admin/QueueActions";

export const dynamic = "force-dynamic";

export default async function QueueDetailPage({ params }: { params: Promise<{ chefId: string }> }) {
  const { chefId } = await params;
  const { supabase } = await requireAdminPage();
  const [chef, provenance] = await Promise.all([
    getAdminChef(supabase, chefId),
    getChefProvenance(supabase, chefId),
  ]);
  if (!chef) notFound();

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Link href="/admin/queue" className="text-sm text-zuby-600 hover:underline">
          ← Back to queue
        </Link>
        <div className="mt-3">
          <ChefDetailView chef={chef} provenance={provenance} />
        </div>
      </div>
      <div className="space-y-3">
        <QueueActions
          chefId={chef.id}
          status={chef.status}
          fssaiNumber={chef.fssaiNumber}
          fssaiVerified={chef.fssaiVerifiedAt !== null}
        />
        <Link
          href={`/admin/chefs/${chef.id}`}
          className="block rounded-md border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Edit this listing
        </Link>
      </div>
    </div>
  );
}
