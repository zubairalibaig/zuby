"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addRankingWin } from "@/lib/admin/actions";

/** Manual capture of a Search Console ranking win (KPI 4). */
export function RankingWinForm() {
  const [query, setQuery] = useState("");
  const [pagePath, setPagePath] = useState("");
  const [position, setPosition] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await addRankingWin({
        query,
        pagePath,
        position: Number(position),
      });
      if (!result.ok) {
        setError(result.error ?? "Failed");
        return;
      }
      setQuery("");
      setPagePath("");
      setPosition("");
      router.refresh();
    });
  }

  return (
    <div className="mt-3">
      <div className="grid gap-2 sm:grid-cols-[2fr_2fr_auto_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Query, e.g. jain tiffin hsr layout"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
        />
        <input
          value={pagePath}
          onChange={(e) => setPagePath(e.target.value)}
          placeholder="/bangalore/hsr-layout/diet/jain"
          className="rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
        />
        <input
          type="number"
          step="0.1"
          min="1"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
          placeholder="Pos"
          className="w-20 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-zuby-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !query.trim() || !pagePath.trim() || !position}
          className="rounded-md bg-zuby-500 px-4 py-1.5 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Record"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
