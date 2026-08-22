import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { getOverview } from "@/lib/admin/queries";

export const dynamic = "force-dynamic";

function Stat({ label, value, href }: { label: string; value: number; href?: string }) {
  const inner = (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <div className="text-2xl font-bold text-neutral-900">{value}</div>
      <div className="mt-1 text-sm text-neutral-500">{label}</div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export default async function AdminHome() {
  const { supabase } = await requireAdminPage();
  const overview = await getOverview(supabase, 7);
  const { counts, events, top_chefs } = overview;

  const maxClicks = Math.max(1, ...top_chefs.map((c) => c.wa_clicks));

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-lg font-semibold text-neutral-900">Overview</h1>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat
            label="Approved chefs"
            value={counts.chefs_approved}
            href="/admin/chefs?status=approved"
          />
          <Stat label="Pending review" value={counts.chefs_pending} href="/admin/queue" />
          <Stat label="Claims pending" value={counts.claims_pending} href="/admin/claims" />
          <Stat
            label="Candidates to review"
            value={counts.candidates_new + counts.candidates_review}
            href="/admin/ingest"
          />
          <Stat
            label="Unclaimed (live)"
            value={counts.chefs_unclaimed}
            href="/admin/chefs?claimed=unclaimed"
          />
          <Stat label="Drafts" value={counts.chefs_draft} href="/admin/chefs?status=draft" />
          <Stat label="Suspended / delisted" value={counts.chefs_suspended} />
        </div>
      </section>

      <section className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">Last 7 days</h2>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between">
              <dt className="text-neutral-500">WhatsApp clicks</dt>
              <dd className="font-semibold text-neutral-900">{events.wa_click ?? 0}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-neutral-500">Profile views</dt>
              <dd className="font-semibold text-neutral-900">{events.profile_view ?? 0}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-neutral-900">
            Top kitchens by WhatsApp clicks (7d)
          </h2>
          {top_chefs.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">No clicks yet.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {top_chefs.map((c) => (
                <li key={c.slug} className="text-sm">
                  <div className="flex justify-between">
                    <span className="truncate text-neutral-700">{c.kitchen_name}</span>
                    <span className="font-semibold text-neutral-900">{c.wa_clicks}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
                    <div
                      className="h-1.5 rounded-full bg-zuby-500"
                      style={{ width: `${(c.wa_clicks / maxClicks) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
