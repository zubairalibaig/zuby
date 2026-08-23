import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { getMetrics } from "@/lib/admin/queries";
import { RankingWinForm } from "@/components/admin/RankingWinForm";

export const dynamic = "force-dynamic";

/** CONCEPT.md's day-60 targets. Shown next to each number so flat is visible. */
const TARGETS = { chefs: 50, visitors: 1000, waClicks: 100, rankings: 3 };

function Kpi({
  label,
  value,
  target,
  sub,
  hint,
}: {
  label: string;
  value: number;
  target: number;
  sub?: string;
  hint?: string;
}) {
  const pct = Math.min(100, Math.round((value / target) * 100));
  const onTrack = value >= target;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-900">{value.toLocaleString()}</p>
      <p className="text-xs text-neutral-400">
        target {target.toLocaleString()}
        {sub && ` · ${sub}`}
      </p>
      <div className="mt-2 h-1.5 rounded-full bg-neutral-100">
        <div
          className={`h-1.5 rounded-full ${onTrack ? "bg-green-500" : "bg-zuby-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {hint && <p className="mt-2 text-xs text-neutral-400">{hint}</p>}
    </div>
  );
}

function Bars({
  title,
  rows,
  note,
}: {
  title: string;
  rows: { name: string; wa_clicks: number; chef_count?: number }[];
  note?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.wa_clicks));
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-neutral-900">{title}</h2>
      {note && <p className="mt-0.5 text-xs text-neutral-400">{note}</p>}
      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-neutral-400">No clicks yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((r) => (
            <li key={r.name} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate text-neutral-700">
                  {r.name}
                  {r.chef_count !== undefined && (
                    <span className="ml-1 text-xs text-neutral-400">
                      ({r.chef_count} {r.chef_count === 1 ? "chef" : "chefs"})
                    </span>
                  )}
                </span>
                <span className="font-semibold text-neutral-900">{r.wa_clicks}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-neutral-100">
                <div
                  className="h-1.5 rounded-full bg-zuby-500"
                  style={{ width: `${(r.wa_clicks / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function MetricsPage() {
  const { supabase } = await requireAdminPage();
  const m = await getMetrics(supabase, 8);

  const latest = m.weekly[m.weekly.length - 1];
  const weekClicks = latest?.wa_clicks ?? 0;
  const weekVisitors = latest?.approx_visitors ?? 0;
  const maxWeekly = Math.max(1, ...m.weekly.map((w) => w.wa_clicks));

  // Where demand outruns supply — the recruitment signal.
  const underServed = m.by_neighbourhood
    .filter((n) => n.chef_count > 0 && n.wa_clicks / n.chef_count > 10)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-neutral-900">Launch metrics</h1>
        <p className="mt-1 text-sm text-neutral-500">
          The four day-60 targets from CONCEPT.md, over the last 8 weeks. If these are flat, the
          discipline is to fix the funnel — not ship features.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Verified chefs"
          value={m.chefs.approved}
          target={TARGETS.chefs}
          sub={`${m.chefs.pending} pending, ${m.chefs.draft} draft`}
        />
        <Kpi
          label="Weekly visitors"
          value={weekVisitors}
          target={TARGETS.visitors}
          sub="this week"
          hint="Approximate — distinct area+day, since we store no visitor identifier. Cross-check against Vercel Analytics."
        />
        <Kpi
          label="Weekly WhatsApp clicks"
          value={weekClicks}
          target={TARGETS.waClicks}
          sub="this week"
        />
        <Kpi
          label="First-page rankings"
          value={m.ranking_wins.filter((r) => r.position <= 10).length}
          target={TARGETS.rankings}
          sub="recorded"
        />
      </div>

      {/* 8-week trend */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">8-week trend</h2>
        {m.weekly.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No events recorded yet.</p>
        ) : (
          <div className="mt-4 flex items-end gap-2" style={{ height: 140 }}>
            {m.weekly.map((w) => (
              <div key={w.week_start} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-medium text-neutral-700">{w.wa_clicks}</span>
                <div
                  className="w-full rounded-t bg-zuby-500"
                  style={{ height: `${(w.wa_clicks / maxWeekly) * 100}%`, minHeight: 2 }}
                  title={`${w.wa_clicks} clicks · ${w.profile_views} views`}
                />
                <span className="text-[10px] text-neutral-400">
                  {new Date(w.week_start).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-neutral-400">
          Bars are WhatsApp clicks per week. Hover for profile views.
        </p>
      </div>

      {underServed.length > 0 && (
        <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
          <h2 className="text-sm font-semibold text-amber-900">Recruit here next</h2>
          <p className="mt-1 text-sm text-amber-800">
            High WhatsApp intent relative to how many chefs we have listed — demand is outrunning
            supply in these areas.
          </p>
          <ul className="mt-2 space-y-1 text-sm text-amber-900">
            {underServed.map((n) => (
              <li key={n.slug}>
                <strong>{n.name}</strong> — {n.wa_clicks} clicks across only {n.chef_count}{" "}
                {n.chef_count === 1 ? "chef" : "chefs"}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Bars
          title="By neighbourhood"
          rows={m.by_neighbourhood}
          note="Where outreach should go next"
        />
        <Bars title="By cuisine" rows={m.by_cuisine} />
        <Bars title="By dietary tag" rows={m.by_dietary} />
      </div>

      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Top chefs by WhatsApp clicks</h2>
        {m.top_chefs.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No clicks yet.</p>
        ) : (
          <ul className="mt-3 space-y-1.5 text-sm">
            {m.top_chefs.map((c) => (
              <li key={c.slug} className="flex justify-between gap-3">
                {c.neighbourhood_slug ? (
                  <Link
                    href={`/${c.city_slug}/${c.neighbourhood_slug}/${c.slug}`}
                    className="truncate text-zuby-600 hover:underline"
                  >
                    {c.kitchen_name}
                  </Link>
                ) : (
                  <span className="truncate text-neutral-700">{c.kitchen_name}</span>
                )}
                <span className="font-semibold text-neutral-900">{c.wa_clicks}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* KPI 4 — manual until GSC API automation, which is explicitly post-V1. */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-neutral-900">Search Console ranking wins</h2>
        <p className="mt-0.5 text-xs text-neutral-400">
          Recorded by hand from the weekly GSC review — see docs/seo-playbook.md. GSC API automation
          is post-V1.
        </p>
        <RankingWinForm />
        {m.ranking_wins.length > 0 && (
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th className="py-1 pr-3">Query</th>
                <th className="py-1 pr-3">Page</th>
                <th className="py-1 pr-3 text-right">Position</th>
                <th className="py-1 text-right">Recorded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {m.ranking_wins.map((r, i) => (
                <tr key={`${r.query}-${i}`}>
                  <td className="py-1.5 pr-3 text-neutral-700">{r.query}</td>
                  <td className="py-1.5 pr-3 text-neutral-500">{r.page_path}</td>
                  <td
                    className={`py-1.5 pr-3 text-right font-semibold ${
                      r.position <= 10 ? "text-green-700" : "text-neutral-500"
                    }`}
                  >
                    {r.position}
                  </td>
                  <td className="py-1.5 text-right text-neutral-400">{r.recorded_on}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
