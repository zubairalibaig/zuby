import Link from "next/link";
import type { Metadata } from "next";
import { requireChefPage } from "@/lib/chef/auth";
import { getMyChef, getChefStats } from "@/lib/chef/queries";
import { copy } from "@/lib/copy/en";

export const metadata: Metadata = { title: copy.dashboard.metaTitle };

function statusLabel(
  status: string,
  latestNote: string | null,
): {
  label: string;
  color: string;
  note: string | null;
} {
  switch (status) {
    case "approved":
      return { label: copy.dashboard.statusLive, color: "bg-green-100 text-green-800", note: null };
    case "pending_review":
      return latestNote
        ? {
            label: copy.dashboard.statusChangesRequested,
            color: "bg-amber-100 text-amber-800",
            note: latestNote,
          }
        : { label: copy.dashboard.statusPending, color: "bg-blue-100 text-blue-800", note: null };
    case "draft":
      return {
        label: copy.dashboard.statusDraft,
        color: "bg-neutral-100 text-neutral-700",
        note: null,
      };
    case "rejected":
      return {
        label: copy.dashboard.statusRejected,
        color: "bg-red-100 text-red-800",
        note: latestNote,
      };
    case "suspended":
      return {
        label: copy.dashboard.statusSuspended,
        color: "bg-red-100 text-red-800",
        note: null,
      };
    default:
      return { label: status, color: "bg-neutral-100 text-neutral-700", note: null };
  }
}

export default async function DashboardOverview() {
  const { supabase, chefId } = await requireChefPage();
  if (!chefId) return null;

  const [chef, stats] = await Promise.all([
    getMyChef(supabase, chefId),
    getChefStats(supabase, chefId),
  ]);
  if (!chef) return <p className="text-neutral-500">Listing not found.</p>;

  const s = statusLabel(chef.status, chef.latestAdminNote);
  const publicUrl =
    chef.status === "approved" && chef.neighbourhoodSlug
      ? `/${chef.citySlug}/${chef.neighbourhoodSlug}/${chef.slug}`
      : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{copy.dashboard.heading}</h1>
        <p className="mt-1 text-lg text-neutral-700">{chef.kitchenName}</p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${s.color}`}>
          {s.label}
        </span>
        {s.note && (
          <p className="mt-3 text-sm text-amber-700 bg-amber-50 rounded-lg p-3">
            <strong>Note from Zuby:</strong> {s.note}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          {publicUrl && (
            <Link
              href={publicUrl}
              className="text-sm font-medium text-zuby-500 hover:text-zuby-600"
            >
              {copy.dashboard.viewPublicPage} →
            </Link>
          )}
          {(chef.status === "draft" || chef.status === "rejected") && (
            <Link
              href="/dashboard/create"
              className="rounded-lg border border-zuby-500 px-4 py-2 text-sm font-semibold text-zuby-600 hover:bg-zuby-50"
            >
              {copy.dashboard.continueSetup}
            </Link>
          )}
          {chef.status === "draft" && (
            <form
              action={async () => {
                "use server";
                const { submitForReview } = await import("@/lib/chef/actions");
                await submitForReview(chefId);
              }}
            >
              <button
                type="submit"
                className="rounded-lg bg-zuby-500 px-4 py-2 text-sm font-semibold text-white hover:bg-zuby-600"
              >
                {copy.dashboard.submitForReview}
              </button>
            </form>
          )}
        </div>

        {/* Pending edits banner */}
        {chef.pendingEdits && (
          <p className="mt-3 text-sm text-blue-700 bg-blue-50 rounded-lg p-3">
            You have changes awaiting review. Your public page shows the old details until approved.
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {copy.dashboard.statsHeading}
        </h2>
        {stats.waClicks > 0 || stats.profileViews > 0 ? (
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-green-50 p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{stats.waClicks}</p>
              <p className="mt-1 text-sm text-green-600">
                {copy.dashboard.statsWaClicks(stats.waClicks)}
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{stats.profileViews}</p>
              <p className="mt-1 text-sm text-blue-600">
                {copy.dashboard.statsProfileViews(stats.profileViews)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-neutral-500">{copy.dashboard.noStats}</p>
        )}
      </div>

      {/* Quick links */}
      <div className="grid gap-3 sm:grid-cols-4">
        {NAV_CARDS.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-xl border border-neutral-200 bg-white p-4 hover:border-zuby-500 hover:shadow-sm transition-all"
          >
            <span className="text-2xl">{card.icon}</span>
            <p className="mt-2 text-sm font-medium text-neutral-900">{card.label}</p>
            <p className="text-xs text-neutral-500">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

const NAV_CARDS = [
  { href: "/dashboard/menu", icon: "🍱", label: "Menu", desc: "Add items, set prices" },
  { href: "/dashboard/timings", icon: "🕐", label: "Timings", desc: "Hours & vacation mode" },
  { href: "/dashboard/photos", icon: "📷", label: "Photos", desc: "Kitchen & food photos" },
  { href: "/dashboard/profile", icon: "✏️", label: "Profile", desc: "Bio, tags, contact" },
];
