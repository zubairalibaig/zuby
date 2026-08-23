import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getAdminChef, getRefData } from "@/lib/admin/queries";
import { PromotionPanel } from "@/components/admin/PromotionPanel";
import { ChefEditorForm } from "@/components/admin/ChefEditorForm";
import { MenuEditor } from "@/components/admin/MenuEditor";
import { PhotoUploader } from "@/components/admin/PhotoUploader";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function ChefEditorPage({ params }: { params: Promise<{ chefId: string }> }) {
  const { chefId } = await params;
  const { supabase } = await requireAdminPage();
  const [chef, ref] = await Promise.all([getAdminChef(supabase, chefId), getRefData(supabase)]);
  if (!chef) notFound();

  const publicHref =
    chef.status === "approved" && chef.neighbourhoodSlug
      ? `/${chef.citySlug}/${chef.neighbourhoodSlug}/${chef.slug}`
      : null;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/chefs" className="text-sm text-zuby-600 hover:underline">
            ← Chefs
          </Link>
          <h1 className="text-lg font-semibold text-neutral-900">{chef.kitchenName}</h1>
          <StatusBadge status={chef.status} />
        </div>
        <div className="flex gap-3 text-sm">
          {publicHref && (
            <Link href={publicHref} target="_blank" className="text-zuby-600 hover:underline">
              View public page ↗
            </Link>
          )}
          <Link href={`/admin/queue/${chef.id}`} className="text-neutral-500 hover:underline">
            Review view
          </Link>
        </div>
      </div>

      <PromotionPanel
        chefId={chef.id}
        status={chef.status}
        promotedUntil={chef.promotedUntil}
        promotedWeight={chef.promotedWeight}
      />

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Profile</h2>
        <ChefEditorForm chef={chef} ref={ref} />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Photos</h2>
        <PhotoUploader chefId={chef.id} coverUrl={chef.photoUrl} photos={chef.photos} />
      </section>

      <section className="rounded-lg border border-neutral-200 bg-white p-5">
        <h2 className="mb-4 text-sm font-semibold text-neutral-900">Menu</h2>
        <MenuEditor
          chefId={chef.id}
          currencyCode={chef.currencyCode}
          items={chef.menuItems.map((m) => ({
            id: m.id,
            name: m.name,
            description: m.description,
            price: m.price,
            unit: m.unit,
            dietary: m.dietary,
            isBestSeller: m.isBestSeller,
            isAvailable: m.isAvailable,
            nutrition: m.nutrition ?? {},
            sortOrder: m.sortOrder,
          }))}
        />
      </section>
    </div>
  );
}
