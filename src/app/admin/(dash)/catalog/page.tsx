import { requireAdminPage } from "@/lib/admin/auth";
import { getRefData } from "@/lib/admin/queries";
import { AddCuisineForm, AddNeighbourhoodForm } from "@/components/admin/CatalogForms";

export const dynamic = "force-dynamic";

/**
 * The admin-UI form for supabase/ops.sql §8 — adding a cuisine or a
 * neighbourhood used to mean pasting SQL into the Supabase SQL Editor by
 * hand. Same admin-only write path, just without a terminal.
 */
export default async function CatalogPage() {
  const { supabase } = await requireAdminPage();
  const ref = await getRefData(supabase);

  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900">Catalog</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Add a cuisine or a neighbourhood. Both go live immediately — a cuisine appears in the picker
        as soon as it exists, and a neighbourhood as soon as a chef is assigned to it, or a buyer
        searches near its point.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <AddCuisineForm />
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-700">
              Existing cuisines ({ref.cuisines.length})
            </h3>
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {ref.cuisines.map((c) => (
                <li
                  key={c.slug}
                  className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"
                >
                  {c.name}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="space-y-4">
          <AddNeighbourhoodForm cities={ref.cities} />
          <div className="rounded-lg border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-neutral-700">
              Existing neighbourhoods ({ref.neighbourhoods.length})
            </h3>
            <ul className="mt-2 max-h-64 space-y-1 overflow-y-auto text-xs text-neutral-600">
              {ref.neighbourhoods.map((n) => (
                <li key={`${n.citySlug}/${n.slug}`}>
                  {n.name} <span className="text-neutral-400">— {n.citySlug}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
