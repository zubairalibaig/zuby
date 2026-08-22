import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listChefs, type ChefListFilters } from "@/lib/admin/queries";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { ChefStatus, ListingSource } from "@/types/db";

export const dynamic = "force-dynamic";

const STATUSES: ChefStatus[] = [
  "draft",
  "pending_review",
  "approved",
  "rejected",
  "suspended",
  "delisted",
];
const SOURCES: ListingSource[] = ["scraped", "self_signup", "claimed"];

export default async function ChefsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; source?: string; claimed?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const { supabase } = await requireAdminPage();

  const filters: ChefListFilters = {
    status: STATUSES.includes(sp.status as ChefStatus) ? (sp.status as ChefStatus) : undefined,
    source: SOURCES.includes(sp.source as ListingSource) ? (sp.source as ListingSource) : undefined,
    claimed: sp.claimed === "claimed" || sp.claimed === "unclaimed" ? sp.claimed : undefined,
    search: sp.q,
  };
  const rows = await listChefs(supabase, filters);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-neutral-900">Chefs</h1>
        <Link
          href="/admin/chefs/new"
          className="rounded-md bg-zuby-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-zuby-600"
        >
          + Create chef
        </Link>
      </div>

      <form className="mt-4 flex flex-wrap gap-2" action="/admin/chefs">
        <input
          name="q"
          defaultValue={sp.q ?? ""}
          placeholder="Search kitchen name…"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm"
        />
        <select
          name="status"
          defaultValue={sp.status ?? ""}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Any status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="source"
          defaultValue={sp.source ?? ""}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Any source</option>
          {SOURCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          name="claimed"
          defaultValue={sp.claimed ?? ""}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Claimed or not</option>
          <option value="claimed">Claimed</option>
          <option value="unclaimed">Unclaimed</option>
        </select>
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100"
        >
          Filter
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Kitchen</th>
              <th className="px-4 py-2">Area</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Claimed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/chefs/${r.id}`}
                    className="font-medium text-zuby-600 hover:underline"
                  >
                    {r.kitchenName}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-500">{r.addressArea ?? "—"}</td>
                <td className="px-4 py-2">
                  <StatusBadge status={r.status} />
                </td>
                <td className="px-4 py-2 text-neutral-500">{r.listingSource}</td>
                <td className="px-4 py-2 text-neutral-500">{r.claimed ? "Yes" : "No"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  No chefs match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
