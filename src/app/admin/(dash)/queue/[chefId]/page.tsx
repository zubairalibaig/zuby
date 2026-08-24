import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getAdminChef, getChefProvenance } from "@/lib/admin/queries";
import { ChefDetailView } from "@/components/admin/ChefDetailView";
import { QueueActions } from "@/components/admin/QueueActions";
import { PendingEditsPanel } from "@/components/admin/PendingEditsPanel";

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
        <div className="mt-3 space-y-4">
          {/* A chef page only exists at /<city>/<neighbourhood>/<chef> — a
              scraped listing whose area text didn't match a known
              neighbourhood (promote_ingest_candidate) lands here with none
              assigned. admin_set_chef_status() now refuses to approve that
              state, so surface it before the admin hits the error. */}
          {!chef.neighbourhoodSlug && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
              No neighbourhood assigned — this listing has no public URL yet and can&apos;t be
              approved until you set one in{" "}
              <Link href={`/admin/chefs/${chef.id}`} className="font-medium underline">
                the editor
              </Link>
              .
            </div>
          )}
          <PendingEditsPanel chef={chef} />
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
