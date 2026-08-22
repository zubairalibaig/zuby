"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { copy } from "@/lib/copy/en";

interface Result {
  id: string;
  kitchenName: string;
  addressArea: string | null;
  slug: string;
}

export function FindKitchenSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();

  function search() {
    if (query.trim().length < 2) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/search-unclaimed?q=${encodeURIComponent(query.trim())}`,
      );
      if (!res.ok) return;
      const data: Result[] = await res.json();
      setResults(data);
      setSearched(true);
    });
  }

  const c = copy.claim;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder={c.searchPlaceholder}
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-zuby-500 focus:outline-none"
        />
        <button
          type="button"
          onClick={search}
          disabled={isPending || query.trim().length < 2}
          className="rounded-lg bg-zuby-500 px-5 py-2 text-sm font-semibold text-white hover:bg-zuby-600 disabled:opacity-50"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </div>

      {searched && results.length === 0 && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center">
          <p className="text-sm text-neutral-500">{c.noResults}</p>
          <Link
            href="/dashboard/create"
            className="mt-3 inline-block text-sm font-medium text-zuby-600 hover:text-zuby-700"
          >
            List my kitchen instead →
          </Link>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <Link
              key={r.id}
              href={`/claim/${r.id}`}
              className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white p-4 hover:border-zuby-400 hover:shadow-sm transition-all"
            >
              <div>
                <p className="font-medium text-neutral-900">{r.kitchenName}</p>
                {r.addressArea && (
                  <p className="mt-0.5 text-sm text-neutral-500">{r.addressArea}</p>
                )}
              </div>
              <span className="text-sm font-medium text-zuby-600">Claim →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
