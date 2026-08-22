"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { createClient } from "@/lib/supabase/browser";
import { addPhoto, deletePhoto, setCoverPhoto } from "@/lib/admin/actions";

type PhotoKind = "kitchen" | "food" | "chef";

interface ExistingPhoto {
  id: string;
  url: string;
  kind: PhotoKind;
}

/** Downscale an image in the browser before upload (long edge ≤ maxEdge). */
async function resizeImage(file: File, maxEdge = 1400, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), "image/webp", quality);
  });
}

export function PhotoUploader({
  chefId,
  coverUrl,
  photos,
}: {
  chefId: string;
  coverUrl: string | null;
  photos: ExistingPhoto[];
}) {
  const [kind, setKind] = useState<PhotoKind>("food");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const blob = await resizeImage(file);
      const supabase = createClient();
      const path = `${chefId}/${crypto.randomUUID()}.webp`;
      const { error: upErr } = await supabase.storage
        .from("chef-photos")
        .upload(path, blob, { contentType: "image/webp", upsert: false });
      if (upErr) throw new Error(upErr.message);
      const { data } = supabase.storage.from("chef-photos").getPublicUrl(path);
      const res = await addPhoto(chefId, data.publicUrl, kind);
      if (!res.ok) throw new Error(res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as PhotoKind)}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="food">Food</option>
          <option value="kitchen">Kitchen</option>
          <option value="chef">Chef</option>
        </select>
        <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100">
          {uploading ? "Uploading…" : "Upload photo"}
          <input
            type="file"
            accept="image/*"
            onChange={onFile}
            disabled={uploading}
            className="hidden"
          />
        </label>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-square overflow-hidden rounded-md border border-neutral-200"
            >
              <Image src={p.url} alt={p.kind} fill sizes="150px" className="object-cover" />
              {coverUrl === p.url && (
                <span className="absolute left-1 top-1 rounded bg-zuby-500 px-1 text-[10px] font-semibold text-white">
                  Cover
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/50 p-1 opacity-0 transition group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => void (await setCoverPhoto(chefId, p.url)))
                  }
                  disabled={pending}
                  className="text-[10px] font-medium text-white hover:underline"
                >
                  Set cover
                </button>
                <button
                  type="button"
                  onClick={() =>
                    startTransition(async () => void (await deletePhoto(chefId, p.id)))
                  }
                  disabled={pending}
                  className="text-[10px] font-medium text-red-300 hover:underline"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
