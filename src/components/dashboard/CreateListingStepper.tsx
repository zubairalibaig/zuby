"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createChefListing, saveChefDraft, submitForReview } from "@/lib/chef/actions";
import { createClient } from "@/lib/supabase/browser";
import { copy } from "@/lib/copy/en";
import type { RefData } from "@/lib/admin/queries";
import type { MyChefDetail } from "@/lib/chef/queries";

interface Props {
  refData: RefData;
  /** An unfinished draft to resume, if the chef abandoned the stepper earlier. */
  draft: MyChefDetail | null;
}

const STEPS = copy.createListing.steps;
const MAX_PHOTO_SIZE = 1200;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > MAX_PHOTO_SIZE || height > MAX_PHOTO_SIZE) {
        const ratio = Math.min(MAX_PHOTO_SIZE / width, MAX_PHOTO_SIZE / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.85);
    };
    img.src = URL.createObjectURL(file);
  });
}

export function CreateListingStepper({ refData, draft }: Props) {
  const [step, setStep] = useState(0);
  const [chefId, setChefId] = useState<string | null>(draft?.id ?? null);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // Step 0: Kitchen info
  const [kitchenName, setKitchenName] = useState(draft?.kitchenName ?? "");
  const [displayName, setDisplayName] = useState(draft?.displayName ?? "");
  const [cityId, setCityId] = useState(draft?.cityId ?? refData.cities[0]?.id ?? "");
  const [neighbourhoodId, setNeighbourhoodId] = useState<string | null>(
    draft?.neighbourhoodId ?? null,
  );

  // Step 1: Location
  const [lat, setLat] = useState<number | null>(draft?.lat ?? null);
  const [lng, setLng] = useState<number | null>(draft?.lng ?? null);
  const [addressArea, setAddressArea] = useState(draft?.addressArea ?? "");
  const [radius, setRadius] = useState(draft?.serviceRadiusKm ?? 5);

  // Step 2: Contact
  const [whatsapp, setWhatsapp] = useState(draft?.whatsappE164 ?? "");

  // Step 3: Cuisines & dietary
  const [cuisineSlugs, setCuisineSlugs] = useState<string[]>(draft?.cuisineSlugs ?? []);
  const [dietaryProfile, setDietaryProfile] = useState(draft?.dietaryProfile ?? "");
  const [tagSlugs, setTagSlugs] = useState<string[]>(draft?.dietaryTagSlugs ?? []);

  // Step 4: FSSAI
  const [fssai, setFssai] = useState(draft?.fssaiNumber ?? "");

  // Step 5: Photos — already-persisted draft photos carry their row id so the
  // final submit doesn't insert them a second time.
  const [photos, setPhotos] = useState<{ url: string; id?: string }[]>(
    draft?.photos.map((p) => ({ url: p.url, id: p.id })) ?? [],
  );
  const [uploading, setUploading] = useState(false);

  // Step 6: Menu
  const [menuItems, setMenuItems] = useState<
    { name: string; price: string; unit: string; dietary: string; id?: string }[]
  >(
    draft?.menuItems.map((m) => ({
      id: m.id,
      name: m.name,
      price: m.price === null ? "" : String(m.price),
      unit: m.unit ?? "",
      dietary: m.dietary ?? "",
    })) ?? [],
  );
  const [newItem, setNewItem] = useState({ name: "", price: "", unit: "per plate", dietary: "" });

  const c = copy.createListing;

  const filteredHoods = refData.neighbourhoods.filter(
    (h) => h.citySlug === refData.cities.find((ct) => ct.id === cityId)?.slug,
  );

  function toggleSlug(list: string[], slug: string): string[] {
    return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
      },
      () => {
        /* silently fall through */
      },
    );
  }

  async function handleStepSave(nextStep: number) {
    setError(null);

    // Step 0: create listing
    if (step === 0 && !chefId) {
      if (!kitchenName.trim() || !displayName.trim()) {
        setError("Kitchen name and your name are required.");
        return;
      }
      startTransition(async () => {
        const result = await createChefListing({
          kitchenName: kitchenName.trim(),
          displayName: displayName.trim(),
          cityId,
          neighbourhoodId,
          slug: slugify(kitchenName),
        });
        if (!result.ok) {
          setError(result.error ?? "Failed");
          return;
        }
        setChefId(result.chefId ?? null);
        setStep(nextStep);
      });
      return;
    }

    // Save draft fields for the current step.
    if (chefId) {
      startTransition(async () => {
        const fields: Record<string, unknown> = {};

        if (step === 1) {
          if (lat != null && lng != null) {
            fields.lat = lat;
            fields.lng = lng;
          }
          fields.addressArea = addressArea || null;
          fields.serviceRadiusKm = radius;
          fields.neighbourhoodId = neighbourhoodId;
        } else if (step === 2) {
          fields.whatsappE164 = whatsapp || null;
        } else if (step === 3) {
          fields.cuisineSlugs = cuisineSlugs;
          fields.dietaryTagSlugs = tagSlugs;
          fields.dietaryProfile = dietaryProfile || null;
        } else if (step === 4) {
          fields.fssaiNumber = fssai || null;
        }

        if (Object.keys(fields).length > 0) {
          const result = await saveChefDraft(chefId, fields as Parameters<typeof saveChefDraft>[1]);
          if (!result.ok) {
            setError(result.error ?? "Failed");
            return;
          }
        }
        setStep(nextStep);
      });
      return;
    }

    setStep(nextStep);
  }

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !chefId) return;
      setUploading(true);
      setError(null);
      try {
        const resized = await resizeImage(file);
        const supabase = createClient();
        // Bucket is `chef-photos`; the path inside it must NOT repeat that
        // name. Filename is a uuid, not a timestamp — two uploads in the same
        // millisecond collide, and upsert:false turns that into a failed upload.
        const path = `${chefId}/${crypto.randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage.from("chef-photos").upload(path, resized, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (upErr) throw new Error(upErr.message);
        const { data: urlData } = supabase.storage.from("chef-photos").getPublicUrl(path);

        // Persist straight away so abandoning the stepper here doesn't lose the
        // upload — the draft is resumable only if what's on screen is in the DB.
        const { chefAddPhoto } = await import("@/lib/chef/actions");
        const result = await chefAddPhoto(chefId, urlData.publicUrl, "food");
        if (!result.ok) throw new Error(result.error);
        setPhotos((prev) => [...prev, { url: urlData.publicUrl, id: result.id }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [chefId],
  );

  function removePhoto(idx: number) {
    const photo = photos[idx];
    if (!photo || !chefId) return;
    startTransition(async () => {
      if (photo.id) {
        const { chefDeletePhoto } = await import("@/lib/chef/actions");
        const result = await chefDeletePhoto(chefId, photo.id);
        if (!result.ok) {
          setError(result.error ?? "Failed");
          return;
        }
      }
      setPhotos((prev) => prev.filter((_, i) => i !== idx));
    });
  }

  function addMenuItem() {
    const name = newItem.name.trim();
    if (!name || !chefId) return;
    setError(null);
    startTransition(async () => {
      const currCode = refData.cities.find((ct) => ct.id === cityId)?.currencyCode ?? "INR";
      const { chefSaveMenuItem } = await import("@/lib/chef/actions");
      const result = await chefSaveMenuItem(chefId, currCode, {
        name,
        description: null,
        price: newItem.price ? Number(newItem.price) : null,
        unit: newItem.unit || null,
        dietary: (newItem.dietary || null) as "veg" | "non_veg" | "egg" | null,
        isBestSeller: false,
        isAvailable: true,
        nutrition: null,
        sortOrder: menuItems.length,
      });
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      setMenuItems((prev) => [...prev, { ...newItem, name, id: result.id }]);
      setNewItem({ name: "", price: "", unit: "per plate", dietary: "" });
    });
  }

  function removeMenuItem(idx: number) {
    const item = menuItems[idx];
    if (!item || !chefId) return;
    startTransition(async () => {
      if (item.id) {
        const { chefDeleteMenuItem } = await import("@/lib/chef/actions");
        const result = await chefDeleteMenuItem(chefId, item.id);
        if (!result.ok) {
          setError(result.error ?? "Failed");
          return;
        }
      }
      setMenuItems((prev) => prev.filter((_, i) => i !== idx));
    });
  }

  async function handleSubmit() {
    if (!chefId) return;
    setError(null);
    startTransition(async () => {
      // Photos and menu items were persisted as they were added (so the draft
      // survives being abandoned); all that's left is the cover and the flip to
      // pending_review.
      const first = photos[0];
      if (first) {
        const { chefSetCoverPhoto } = await import("@/lib/chef/actions");
        await chefSetCoverPhoto(chefId, first.url);
      }

      const result = await submitForReview(chefId);
      if (!result.ok) {
        setError(result.error ?? "Failed to submit");
        return;
      }
      setSubmitted(true);
    });
  }

  // Submitted state.
  if (submitted) {
    return (
      <div className="mt-10 text-center">
        <div className="text-4xl">🎉</div>
        <h2 className="mt-4 text-xl font-bold text-neutral-900">{c.submittedHeading}</h2>
        <p className="mt-2 text-neutral-500">{c.submittedBody}</p>
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          className="mt-6 rounded-lg bg-zuby-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600"
        >
          {c.viewDashboard}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Step indicator */}
      <div className="flex gap-1">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`h-1 flex-1 rounded-full ${i <= step ? "bg-zuby-500" : "bg-neutral-200"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-xs font-medium text-neutral-500">
        Step {step + 1} of {STEPS.length} — {STEPS[step]}
      </p>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <div className="mt-6 space-y-4">
        {/* Step 0: Kitchen info */}
        {step === 0 && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                {c.kitchenNameLabel}
              </label>
              <input
                value={kitchenName}
                onChange={(e) => setKitchenName(e.target.value)}
                placeholder={c.kitchenNamePlaceholder}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                {c.displayNameLabel}
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder={c.displayNamePlaceholder}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">{c.cityLabel}</label>
              <select
                value={cityId}
                onChange={(e) => {
                  setCityId(e.target.value);
                  setNeighbourhoodId(null);
                }}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
              >
                {refData.cities.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                  </option>
                ))}
              </select>
            </div>
            {filteredHoods.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-neutral-700">
                  {c.neighbourhoodLabel}
                </label>
                <select
                  value={neighbourhoodId ?? ""}
                  onChange={(e) => setNeighbourhoodId(e.target.value || null)}
                  className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
                >
                  <option value="">Select…</option>
                  {filteredHoods.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {/* Step 1: Location */}
        {step === 1 && (
          <>
            <h3 className="text-sm font-semibold text-neutral-700">{c.locationHeading}</h3>
            <button
              type="button"
              onClick={useMyLocation}
              className="rounded-lg border border-zuby-500 px-4 py-2 text-sm font-medium text-zuby-600 hover:bg-zuby-50"
            >
              📍 {c.useMyLocation}
            </button>
            {lat != null && lng != null && (
              <p className="text-xs text-green-600">
                Location set ({lat.toFixed(4)}, {lng.toFixed(4)})
              </p>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700">{c.areaLabel}</label>
              <input
                value={addressArea}
                onChange={(e) => setAddressArea(e.target.value)}
                placeholder={c.areaPlaceholder}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700">{c.radiusLabel}</label>
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
          </>
        )}

        {/* Step 2: Contact */}
        {step === 2 && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                {c.whatsappLabel}
              </label>
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder={c.whatsappPlaceholder}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-400">{c.whatsappHelp}</p>
            </div>
          </>
        )}

        {/* Step 3: Cuisines & dietary */}
        {step === 3 && (
          <>
            <div>
              <label className="block text-sm font-medium text-neutral-700">
                {c.dietaryProfileLabel}
              </label>
              <select
                value={dietaryProfile}
                onChange={(e) => setDietaryProfile(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
              >
                <option value="">Select…</option>
                {Object.entries(c.dietaryProfileOptions).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">{c.cuisineLabel}</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {refData.cuisines.map((cu) => (
                  <button
                    key={cu.slug}
                    type="button"
                    onClick={() => setCuisineSlugs(toggleSlug(cuisineSlugs, cu.slug))}
                    className={`rounded-full border px-3 py-1 text-sm ${
                      cuisineSlugs.includes(cu.slug)
                        ? "border-zuby-500 bg-zuby-50 text-zuby-600 font-medium"
                        : "border-neutral-300 text-neutral-600 hover:border-neutral-400"
                    }`}
                  >
                    {cu.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-neutral-700">
                {c.dietaryTagsLabel}
              </label>
              <div className="mt-2 flex flex-wrap gap-2">
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
          </>
        )}

        {/* Step 4: FSSAI */}
        {step === 4 && (
          <>
            <h3 className="text-sm font-semibold text-neutral-700">{c.fssaiHeading}</h3>
            <div>
              <label className="block text-sm font-medium text-neutral-700">{c.fssaiLabel}</label>
              <input
                value={fssai}
                onChange={(e) => setFssai(e.target.value.replace(/\D/g, "").slice(0, 14))}
                placeholder={c.fssaiPlaceholder}
                className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-mono focus:border-zuby-500 focus:outline-none"
              />
              <p className="mt-1 text-xs text-neutral-400">{c.fssaiHelp}</p>
            </div>
            <details className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
              <summary className="cursor-pointer text-sm font-medium text-zuby-600">
                {c.fssaiHowToGet}
              </summary>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-neutral-600">
                {c.fssaiSteps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
              <a
                href="https://foscos.fssai.gov.in/"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-sm font-medium text-zuby-600 hover:text-zuby-700"
              >
                {c.fssaiPortalLink} →
              </a>
            </details>
          </>
        )}

        {/* Step 5: Photos */}
        {step === 5 && (
          <>
            <h3 className="text-sm font-semibold text-neutral-700">{c.photosHeading}</h3>
            <p className="text-xs text-neutral-400">{c.photosHelp}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photos.map((photo, idx) => (
                <div
                  key={idx}
                  className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100"
                >
                  <Image
                    src={photo.url}
                    alt={`Photo ${idx + 1}`}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(idx)}
                    className="absolute right-1 top-1 rounded-full bg-black/50 px-1.5 py-0.5 text-xs text-white"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {photos.length < 8 && (
                <label className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 hover:border-zuby-400 hover:text-zuby-500">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                  />
                  {uploading ? "Uploading…" : "+ Add photo"}
                </label>
              )}
            </div>
          </>
        )}

        {/* Step 6: Menu */}
        {step === 6 && (
          <>
            <h3 className="text-sm font-semibold text-neutral-700">{c.menuHeading}</h3>
            <p className="text-xs text-neutral-400">{c.menuHelp}</p>

            {menuItems.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between rounded-lg border border-neutral-200 bg-white px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900">
                    {item.dietary === "veg"
                      ? "🟢 "
                      : item.dietary === "non_veg"
                        ? "🔴 "
                        : item.dietary === "egg"
                          ? "🟡 "
                          : ""}
                    {item.name}
                  </p>
                  {item.price && (
                    <p className="text-xs text-neutral-500">
                      {item.price} {item.unit ? `/ ${item.unit}` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeMenuItem(idx)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            ))}

            <div className="space-y-2 rounded-lg border-2 border-dashed border-neutral-200 p-3">
              <input
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                placeholder="Item name"
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  value={newItem.price}
                  onChange={(e) => setNewItem({ ...newItem, price: e.target.value })}
                  placeholder="Price"
                  min={0}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
                />
                <select
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
                >
                  <option value="per plate">per plate</option>
                  <option value="per kg">per kg</option>
                  <option value="per tiffin">per tiffin</option>
                  <option value="per box">per box</option>
                  <option value="per piece">per piece</option>
                </select>
                <select
                  value={newItem.dietary}
                  onChange={(e) => setNewItem({ ...newItem, dietary: e.target.value })}
                  className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
                >
                  <option value="">Dietary</option>
                  <option value="veg">🟢 Veg</option>
                  <option value="non_veg">🔴 Non-veg</option>
                  <option value="egg">🟡 Egg</option>
                </select>
              </div>
              <button
                type="button"
                onClick={addMenuItem}
                disabled={!newItem.name.trim()}
                className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-200 disabled:opacity-50"
              >
                + Add item
              </button>
            </div>
          </>
        )}
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex justify-between">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={isPending}
            className="rounded-lg border border-neutral-300 px-5 py-2.5 text-sm font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50"
          >
            {c.back}
          </button>
        ) : (
          <div />
        )}

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => handleStepSave(step + 1)}
            disabled={isPending}
            className="rounded-lg bg-zuby-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
          >
            {isPending ? "Saving…" : c.next}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-lg bg-zuby-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
          >
            {isPending ? "Submitting…" : c.submitForReview}
          </button>
        )}
      </div>
    </div>
  );
}
