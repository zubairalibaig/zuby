import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { after } from "next/server";
import { getAllApprovedChefUrls, getChefBySlug } from "@/lib/supabase/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { TagChip } from "@/components/directory/TagChip";
import { VerifiedBadge } from "@/components/directory/VerifiedBadge";
import { MenuItemRow } from "@/components/directory/MenuItemRow";
import { WhatsAppButton } from "@/components/directory/WhatsAppButton";
import { Breadcrumbs } from "@/components/directory/Breadcrumbs";
import { ChefDistance } from "@/components/directory/ChefDistance";
import { JsonLd } from "@/components/directory/JsonLd";
import { chefJsonLd, breadcrumbJsonLd } from "@/lib/seo/jsonld";
import { describeToday, describeWeek } from "@/lib/format";
import { copy } from "@/lib/copy/en";

export const revalidate = 3600;

interface ChefPageProps {
  params: Promise<{ city: string; neighbourhood: string; chef: string }>;
}

export async function generateStaticParams({
  params,
}: {
  params: { city: string; neighbourhood: string };
}) {
  try {
    const urls = await getAllApprovedChefUrls();
    return urls
      .filter((u) => u.citySlug === params.city && u.neighbourhoodSlug === params.neighbourhood)
      .map((u) => ({ chef: u.chefSlug }));
  } catch (err) {
    console.warn("generateStaticParams([chef]) skipped — DB not reachable:", err);
    return [];
  }
}

export async function generateMetadata({ params }: ChefPageProps): Promise<Metadata> {
  const { city, neighbourhood, chef: chefSlug } = await params;
  const chef = await getChefBySlug(city, neighbourhood, chefSlug);
  if (!chef) return {};

  const title = `${chef.kitchenName} — Home Chef in ${chef.neighbourhoodName}, ${chef.cityName} | Zuby`;
  const cuisineList = chef.cuisines.map((c) => c.name).join(", ");
  const tagList = chef.dietaryTags.map((t) => t.name).join(", ");
  const description =
    chef.bio ??
    [
      cuisineList && `${cuisineList} home cooking`,
      tagList && `${tagList}`,
      `in ${chef.neighbourhoodName}`,
    ]
      .filter(Boolean)
      .join(" · ");

  const path = `/${chef.citySlug}/${chef.neighbourhoodSlug}/${chef.slug}`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title, description, images: chef.photoUrl ? [chef.photoUrl] : undefined },
  };
}

/**
 * Best-effort, in-memory de-dupe + bot filter for profile_view logging. Resets
 * on cold start — acceptable for a first-cut "basic" rate limit (Phase 1 spec).
 */
const recentViews = new Map<string, number>();
const VIEW_DEDUPE_WINDOW_MS = 60_000;
const BOT_UA_PATTERN = /bot|crawl|spider|slurp|facebookexternalhit|preview/i;

async function logProfileView(chefId: string, cityId: string | null) {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  if (BOT_UA_PATTERN.test(ua)) return;

  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const key = `${chefId}:${ip}`;
  const now = Date.now();
  const last = recentViews.get(key);
  if (last && now - last < VIEW_DEDUPE_WINDOW_MS) return;
  recentViews.set(key, now);
  if (recentViews.size > 5000) recentViews.clear(); // crude bound on memory

  try {
    const admin = createAdminClient();
    await admin.from("events").insert({ kind: "profile_view", chef_id: chefId, city_id: cityId });
  } catch {
    // Analytics must never break the page.
  }
}

export default async function ChefPage({ params }: ChefPageProps) {
  const { city, neighbourhood, chef: chefSlug } = await params;
  const chef = await getChefBySlug(city, neighbourhood, chefSlug);
  if (!chef) notFound();

  // Runs after the response is sent (Next.js `after()`) so analytics never
  // adds latency to the page, and — unlike a bare fire-and-forget promise —
  // the platform keeps the function alive until it actually finishes.
  after(() => logProfileView(chef.id, null));

  const path = `/${chef.citySlug}/${chef.neighbourhoodSlug}/${chef.slug}`;
  const approxGeo =
    chef.approxLat !== null && chef.approxLng !== null
      ? { lat: chef.approxLat, lng: chef.approxLng }
      : null;

  const crumbs = [
    { name: "Zuby", path: "/" },
    { name: chef.cityName, path: `/${chef.citySlug}` },
    { name: chef.neighbourhoodName ?? "", path: `/${chef.citySlug}/${chef.neighbourhoodSlug}` },
    { name: chef.kitchenName, path },
  ];

  const bestSellers = chef.menuItems.filter((m) => m.isBestSeller);
  const restOfMenu = chef.menuItems.filter((m) => !m.isBestSeller);
  const weeklySchedule = describeWeek(chef.timings);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-10">
      <JsonLd data={chefJsonLd(chef, path, approxGeo)} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />

      <Breadcrumbs crumbs={crumbs} />

      {chef.isUnclaimed && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-4 py-3 text-sm">
          <div>
            <p className="font-medium text-amber-900">{copy.chef.unclaimedBanner}</p>
            <p className="text-amber-700">{copy.chef.unclaimedBannerBody}</p>
          </div>
          <Link
            href="/for-chefs"
            className="shrink-0 rounded-full bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600"
          >
            {copy.chef.unclaimedBannerCta}
          </Link>
        </div>
      )}

      <div className="mt-6 flex items-start gap-4">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 sm:h-28 sm:w-28">
          {chef.photoUrl ? (
            <Image
              src={chef.photoUrl}
              alt={chef.kitchenName}
              fill
              sizes="112px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-3xl text-neutral-300">
              🍱
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold text-neutral-900">{chef.kitchenName}</h1>
            {chef.isVerified && <VerifiedBadge />}
          </div>
          <p className="mt-1 text-neutral-500">
            {chef.addressArea ?? chef.neighbourhoodName}
            {approxGeo && (
              <>
                {" · "}
                <ChefDistance lat={approxGeo.lat} lng={approxGeo.lng} />
              </>
            )}
          </p>
          {chef.fssaiNumber && (
            <p className="mt-1 text-xs text-neutral-400">
              {copy.chef.fssaiLabel}: {chef.fssaiNumber}
            </p>
          )}
        </div>
      </div>

      {chef.bio && <p className="mt-4 text-neutral-600">{chef.bio}</p>}

      {(chef.cuisines.length > 0 || chef.dietaryTags.length > 0) && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {chef.dietaryTags.map((tag) => (
            <TagChip key={tag.slug} slug={tag.slug} name={tag.name} />
          ))}
        </div>
      )}
      {chef.cuisines.length > 0 && (
        <p className="mt-2 text-sm text-neutral-500">
          {copy.chef.cuisinesLabel}: {chef.cuisines.map((c) => c.name).join(", ")}
        </p>
      )}

      <div className="mt-6 hidden sm:block">
        <WhatsAppButton chefId={chef.id} />
      </div>

      {chef.timings && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {copy.chef.timingsHeading}
          </h2>
          <p className="mt-2 font-medium text-neutral-900">{describeToday(chef.timings)}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm text-neutral-500 sm:grid-cols-4">
            {weeklySchedule.map((d) => (
              <div key={d.day} className="flex justify-between gap-2">
                <dt className="font-medium text-neutral-600">{d.day}</dt>
                <dd>{d.text}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {chef.photos.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {copy.chef.photosHeading}
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {chef.photos.map((photo) => (
              <div
                key={photo.url}
                className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
              >
                <Image
                  src={photo.url}
                  alt={chef.kitchenName}
                  fill
                  sizes="200px"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {chef.menuItems.length > 0 && (
        <section className="mt-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {copy.chef.menuHeading}
          </h2>
          <div className="mt-2 divide-y divide-neutral-100">
            {[...bestSellers, ...restOfMenu].map((item) => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <WhatsAppButton chefId={chef.id} sticky />
    </main>
  );
}
