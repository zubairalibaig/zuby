"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { chefAddPhoto, chefDeletePhoto, chefSetCoverPhoto } from "@/lib/chef/actions";
import { createClient } from "@/lib/supabase/browser";
import { copy } from "@/lib/copy/en";

interface Photo {
  id: string;
  url: string;
  kind: "kitchen" | "food" | "chef";
  sortOrder: number;
}

interface Props {
  chefId: string;
  photos: Photo[];
  coverUrl: string | null;
}

const MAX_SIZE = 1200;

async function resizeImage(file: File): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      if (width > MAX_SIZE || height > MAX_SIZE) {
        const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
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

export function DashboardPhotoManager({ chefId, photos, coverUrl }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);
      setError(null);
      try {
        const resized = await resizeImage(file);
        const supabase = createClient();
        const path = `chef-photos/${chefId}/${Date.now()}.jpg`;
        const { error: upErr } = await supabase.storage.from("photos").upload(path, resized, {
          contentType: "image/jpeg",
          upsert: false,
        });
        if (upErr) throw new Error(upErr.message);

        const { data: urlData } = supabase.storage.from("photos").getPublicUrl(path);
        const result = await chefAddPhoto(chefId, urlData.publicUrl, "food");
        if (!result.ok) throw new Error(result.error);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [chefId, router],
  );

  function remove(photoId: string) {
    startTransition(async () => {
      await chefDeletePhoto(chefId, photoId);
      router.refresh();
    });
  }

  function setCover(url: string) {
    startTransition(async () => {
      await chefSetCoverPhoto(chefId, url);
      router.refresh();
    });
  }

  return (
    <div className="mt-6 space-y-4">
      <p className="text-sm text-neutral-500">{copy.createListing.photosHelp}</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {photos.map((photo) => (
          <div key={photo.id} className="group relative">
            <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
              <Image src={photo.url} alt="Photo" fill sizes="200px" className="object-cover" />
              {coverUrl === photo.url && (
                <span className="absolute left-1 top-1 rounded bg-zuby-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  Cover
                </span>
              )}
            </div>
            <div className="mt-1 flex gap-2 text-xs">
              {coverUrl !== photo.url && (
                <button
                  type="button"
                  onClick={() => setCover(photo.url)}
                  disabled={isPending}
                  className="text-zuby-500 hover:text-zuby-600"
                >
                  Set cover
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(photo.id)}
                disabled={isPending}
                className="text-red-500 hover:text-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {photos.length < 8 && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-neutral-400 hover:border-zuby-400 hover:text-zuby-500">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
            {uploading ? "Uploading…" : "+ Add photo"}
          </label>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
