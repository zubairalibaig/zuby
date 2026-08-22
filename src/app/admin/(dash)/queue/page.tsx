import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { getQueue } from "@/lib/admin/queries";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

function Check({ ok }: { ok: boolean }) {
  return <span className={ok ? "text-green-600" : "text-neutral-300"}>{ok ? "✓" : "—"}</span>;
}

export default async function QueuePage() {
  const { supabase } = await requireAdminPage();
  const rows = await getQueue(supabase);

  return (
    <div>
      <h1 className="text-lg font-semibold text-neutral-900">Verification queue</h1>
      <p className="mt-1 text-sm text-neutral-500">
        {rows.length} listing{rows.length === 1 ? "" : "s"} awaiting review, oldest first.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 rounded-lg border border-neutral-200 bg-white p-8 text-center text-neutral-500">
          Nothing waiting. Promote scraped candidates from{" "}
          <Link href="/admin/ingest" className="text-zuby-600 hover:underline">
            Ingest
          </Link>
          .
        </p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="px-4 py-2">Kitchen</th>
                <th className="px-4 py-2">Area</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2 text-center">Photo</th>
                <th className="px-4 py-2 text-center">FSSAI</th>
                <th className="px-4 py-2 text-center">WA</th>
                <th className="px-4 py-2 text-center">Menu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-neutral-50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/admin/queue/${r.id}`}
                      className="font-medium text-zuby-600 hover:underline"
                    >
                      {r.kitchenName}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-neutral-500">{r.addressArea ?? "—"}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={r.listingSource} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Check ok={r.hasPhoto} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Check ok={r.hasFssai} />
                  </td>
                  <td className="px-4 py-2 text-center">
                    <Check ok={r.hasWhatsapp} />
                  </td>
                  <td className="px-4 py-2 text-center text-neutral-500">{r.menuCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
