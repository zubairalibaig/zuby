import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { listIngestCandidates } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

const TABS = [
  { key: "new", label: "Ready" },
  { key: "needs_review", label: "Needs review" },
  { key: "promoted", label: "Promoted" },
  { key: "discarded", label: "Discarded" },
];

export default async function IngestPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status ?? "new";
  const { supabase } = await requireAdminPage();
  const rows = await listIngestCandidates(supabase, status);

  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900">Ingest candidates</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Collected by the “Ingest chefs” GitHub Action. Promote the good ones — they land in the
        review queue, never straight to public.
      </p>

      <div className="mt-4 flex gap-1">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/ingest?status=${t.key}`}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              status === t.key ? "bg-zuby-500 text-white" : "text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th className="px-4 py-2">Kitchen</th>
              <th className="px-4 py-2">Area</th>
              <th className="px-4 py-2">WhatsApp</th>
              <th className="px-4 py-2">Source</th>
              <th className="px-4 py-2">Flags</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-neutral-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/ingest/${r.id}`}
                    className="font-medium text-zuby-600 hover:underline"
                  >
                    {r.kitchenName ?? "—"}
                  </Link>
                </td>
                <td className="px-4 py-2 text-neutral-500">{r.area ?? r.neighbourhood ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-500">{r.whatsapp ?? "—"}</td>
                <td className="px-4 py-2 text-neutral-500">{r.source ?? "—"}</td>
                <td className="px-4 py-2">
                  {r.hasDuplicate && (
                    <span className="mr-1 rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800">
                      dup?
                    </span>
                  )}
                  {r.hasUnmapped && (
                    <span className="rounded bg-orange-100 px-1.5 py-0.5 text-xs text-orange-800">
                      unmapped
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-neutral-400">
                  Nothing here.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
