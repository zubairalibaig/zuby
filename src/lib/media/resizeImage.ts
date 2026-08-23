"use client";

/**
 * The one place a chef photo gets downscaled and recompressed before upload.
 * Four call sites used to each carry their own copy of this, with three
 * different formats and three different size caps — this consolidates them
 * and, more importantly, sets caps against what the UI actually displays
 * (nothing on the site renders one of these photos above ~280px today) rather
 * than an arbitrary "big enough" number. See docs/cost-controls.md: Supabase's
 * free tier bills on egress, and the fastest way to stay well under it forever
 * is to never store a byte larger than what will ever be served.
 */
export interface ResizedImage {
  blob: Blob;
  contentType: string;
  /** File extension, no leading dot, for building the storage path. */
  extension: string;
}

export interface ResizeOptions {
  /** Longest edge, in pixels, after downscaling. */
  maxEdge: number;
  /** 0–1, applies to whichever format ends up used. */
  quality?: number;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Downscales to `maxEdge` and re-encodes as WebP — smaller than JPEG at
 * equivalent visual quality, which matters when every byte stored is a byte
 * re-served on every view. Falls back to JPEG if the browser's canvas
 * silently ignores the requested WebP type (older Safari/WebViews) rather
 * than shipping whatever the browser defaults to, which is usually a much
 * larger PNG.
 */
export async function resizeImage(file: File, opts: ResizeOptions): Promise<ResizedImage> {
  const quality = opts.quality ?? 0.82;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, opts.maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { blob: file, contentType: file.type || "image/jpeg", extension: "jpg" };
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const webp = await toBlob(canvas, "image/webp", quality);
  if (webp && webp.type === "image/webp") {
    return { blob: webp, contentType: "image/webp", extension: "webp" };
  }

  const jpeg = await toBlob(canvas, "image/jpeg", quality);
  return { blob: jpeg ?? file, contentType: "image/jpeg", extension: "jpg" };
}

/**
 * One year, in seconds, for Supabase Storage's `cacheControl` upload option.
 * Every upload path uses a uuid filename and never overwrites an existing
 * object (`upsert: false`), so a given URL's content genuinely never
 * changes — safe to cache as close to forever as the header allows, which
 * cuts repeat-view egress from Supabase to nearly zero after the first serve
 * (browsers, and Vercel's own image-optimization cache, both honour this).
 */
export const IMMUTABLE_CACHE_CONTROL = "31536000";
