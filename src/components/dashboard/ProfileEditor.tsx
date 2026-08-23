"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { chefSaveProfile } from "@/lib/chef/actions";
import { copy } from "@/lib/copy/en";
import type { MyChefDetail } from "@/lib/chef/queries";
import type { RefData } from "@/lib/admin/queries";

interface Props {
  chef: MyChefDetail;
  refData: RefData;
}

export function DashboardProfileEditor({ chef, refData }: Props) {
  const [bio, setBio] = useState(chef.bio ?? "");
  const [addressArea, setAddressArea] = useState(chef.addressArea ?? "");
  const [instagram, setInstagram] = useState(chef.instagramHandle ?? "");
  const [radius, setRadius] = useState(chef.serviceRadiusKm);
  const [dietaryProfile, setDietaryProfile] = useState(chef.dietaryProfile ?? "");
  const [cuisineSlugs, setCuisineSlugs] = useState<string[]>(chef.cuisineSlugs);
  const [tagSlugs, setTagSlugs] = useState<string[]>(chef.dietaryTagSlugs);

  // Trust fields.
  const [displayName, setDisplayName] = useState(chef.displayName);
  const [whatsapp, setWhatsapp] = useState(chef.whatsappE164 ?? "");
  const [fssai, setFssai] = useState(chef.fssaiNumber ?? "");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isApproved = chef.status === "approved";

  function toggleSlug(list: string[], slug: string): string[] {
    return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  }

  function save() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await chefSaveProfile(chef.id, {
        displayName,
        bio: bio || null,
        addressArea: addressArea || null,
        instagramHandle: instagram || null,
        serviceRadiusKm: radius,
        dietaryProfile: (dietaryProfile || null) as "veg_only" | "non_veg" | "mixed" | null,
        cuisineSlugs,
        dietaryTagSlugs: tagSlugs,
        whatsappE164: whatsapp || null,
        fssaiNumber: fssai || null,
      });
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      setSuccess(true);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Trust fields (with warning) */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Identity & contact
        </h3>
        {isApproved && (
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg p-3">
            ⚠️ {copy.dashboard.trustFieldWarning}
          </p>
        )}

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            {copy.createListing.displayNameLabel}
          </label>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            {copy.createListing.whatsappLabel}
          </label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder={copy.createListing.whatsappPlaceholder}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
          />
          <p className="mt-1 text-xs text-neutral-400">{copy.createListing.whatsappHelp}</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            {copy.createListing.fssaiLabel}
          </label>
          <input
            value={fssai}
            onChange={(e) => setFssai(e.target.value.replace(/\D/g, "").slice(0, 14))}
            placeholder={copy.createListing.fssaiPlaceholder}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono focus:border-zuby-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Safe fields */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            placeholder="Tell customers about your kitchen…"
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            {copy.createListing.areaLabel}
          </label>
          <input
            value={addressArea}
            onChange={(e) => setAddressArea(e.target.value)}
            placeholder={copy.createListing.areaPlaceholder}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Instagram handle</label>
          <input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourhandle"
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            {copy.createListing.radiusLabel}
          </label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
          >
            <option value={2}>2 km</option>
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={15}>15 km</option>
            <option value={20}>20 km</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">
            {copy.createListing.dietaryProfileLabel}
          </label>
          <select
            value={dietaryProfile}
            onChange={(e) => setDietaryProfile(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
          >
            <option value="">Select…</option>
            {Object.entries(copy.createListing.dietaryProfileOptions).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cuisines */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {copy.createListing.cuisineLabel}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {refData.cuisines.map((c) => (
            <button
              key={c.slug}
              type="button"
              onClick={() => setCuisineSlugs(toggleSlug(cuisineSlugs, c.slug))}
              className={`rounded-full border px-3 py-1 text-sm ${
                cuisineSlugs.includes(c.slug)
                  ? "border-zuby-500 bg-zuby-50 text-zuby-600 font-medium"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Dietary tags */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {copy.createListing.dietaryTagsLabel}
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {refData.dietaryTags.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => setTagSlugs(toggleSlug(tagSlugs, t.slug))}
              className={`rounded-full border px-3 py-1 text-sm ${
                tagSlugs.includes(t.slug)
                  ? "border-zuby-500 bg-zuby-50 text-zuby-600 font-medium"
                  : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && <p className="text-sm text-green-600">Profile saved!</p>}

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="rounded-lg bg-zuby-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
      >
        {isPending ? "Saving…" : "Save profile"}
      </button>
    </div>
  );
}
