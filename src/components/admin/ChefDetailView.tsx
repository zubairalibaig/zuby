import Image from "next/image";
import { formatPrice, describeWeek } from "@/lib/format";
import { parseTimings, parseNutrition } from "@/types/schemas";
import { StatusBadge } from "@/components/admin/StatusBadge";
import type { AdminChefDetail } from "@/lib/admin/queries";

/** Read-only rendering of every chef field, for the review screen. */
export function ChefDetailView({
  chef,
  provenance,
}: {
  chef: AdminChefDetail;
  provenance?: { source: string | null; sourceUrl: string | null } | null;
}) {
  const timings = parseTimings(chef.timings);
  const week = describeWeek(timings);
  const hasPoint = chef.lat !== null && chef.lng !== null;
  const embed = hasPoint
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${chef.lng! - 0.01},${chef.lat! - 0.01},${chef.lng! + 0.01},${chef.lat! + 0.01}&layer=mapnik&marker=${chef.lat},${chef.lng}`
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-neutral-900">{chef.kitchenName}</h1>
            <StatusBadge status={chef.status} />
          </div>
          <p className="text-sm text-neutral-500">
            {chef.displayName} · {chef.neighbourhoodSlug ?? "no neighbourhood"} · {chef.citySlug}
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            Source: {chef.listingSource}
            {chef.claimedBy ? " · claimed" : " · unclaimed"}
            {provenance?.sourceUrl && (
              <>
                {" · "}
                <a
                  href={provenance.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-zuby-600 hover:underline"
                >
                  origin ({provenance.source})
                </a>
              </>
            )}
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Detail label="WhatsApp" value={chef.whatsappE164} />
        <Detail label="Phone" value={chef.phoneE164} />
        <Detail label="Instagram" value={chef.instagramHandle} />
        <Detail label="FSSAI" value={chef.fssaiNumber} />
        <Detail label="Service radius" value={`${chef.serviceRadiusKm} km`} />
        <Detail label="Dietary profile" value={chef.dietaryProfile} />
        <Detail label="Public area" value={chef.addressArea} />
        <Detail label="Full address (private)" value={chef.addressText} />
      </dl>

      {chef.bio && <p className="text-sm text-neutral-600">{chef.bio}</p>}

      <div className="flex flex-wrap gap-1.5 text-xs">
        {chef.cuisineSlugs.map((c) => (
          <span key={c} className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600">
            {c}
          </span>
        ))}
        {chef.dietaryTagSlugs.map((t) => (
          <span key={t} className="rounded-full bg-zuby-50 px-2 py-0.5 text-zuby-700">
            {t}
          </span>
        ))}
      </div>

      {embed && (
        <iframe
          title="Location"
          className="h-56 w-full rounded-md border border-neutral-200"
          src={embed}
          loading="lazy"
        />
      )}

      {chef.photos.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {chef.photos.map((p) => (
            <div
              key={p.id}
              className="relative aspect-square overflow-hidden rounded-md border border-neutral-200"
            >
              <Image src={p.url} alt={p.kind} fill sizes="150px" className="object-cover" />
            </div>
          ))}
        </div>
      )}

      {chef.menuItems.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Menu
          </h3>
          <ul className="divide-y divide-neutral-100 rounded-md border border-neutral-200">
            {chef.menuItems.map((m) => {
              const nut = parseNutrition(m.nutrition);
              return (
                <li key={m.id} className="flex justify-between px-3 py-2 text-sm">
                  <span>
                    {m.name}
                    {m.isBestSeller && (
                      <span className="ml-2 text-[10px] font-semibold text-zuby-600">BEST</span>
                    )}
                    {nut?.calories_kcal !== undefined && (
                      <span className="ml-2 text-xs text-neutral-400">
                        {nut.calories_kcal} kcal
                      </span>
                    )}
                  </span>
                  <span className="text-neutral-500">
                    {m.price !== null ? formatPrice(m.price, m.currencyCode) : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {week.length > 0 && (
        <div className="text-sm text-neutral-500">
          {week.map((d) => (
            <span key={d.day} className="mr-3 inline-block">
              <span className="font-medium text-neutral-600">{d.day}</span> {d.text}
            </span>
          ))}
        </div>
      )}

      {chef.auditLog.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Audit trail
          </h3>
          <ul className="space-y-1 text-xs text-neutral-500">
            {chef.auditLog.map((l, i) => (
              <li key={i}>
                <span className="font-medium text-neutral-700">{l.action}</span>
                {l.note && ` — ${l.note}`}{" "}
                <span className="text-neutral-400">({new Date(l.createdAt).toLocaleString()})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="text-neutral-800">{value ?? "—"}</dd>
    </div>
  );
}
