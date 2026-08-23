"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SearchSuggestion } from "@/types/db";
import { copy } from "@/lib/copy/en";
import type { ChosenLocation } from "@/components/home/LocationPicker";

const KIND_ICON: Record<SearchSuggestion["kind"], string> = {
  chef: "🍱",
  dish: "🍛",
  cuisine: "🥘",
  dietary: "🌱",
  area: "📍",
};

/** Where a suggestion takes you. Every kind resolves to a real indexable page. */
function hrefFor(s: SearchSuggestion, citySlug: string, loc: ChosenLocation | null): string {
  switch (s.kind) {
    case "chef":
      return s.neighbourhood_slug
        ? `/${s.city_slug}/${s.neighbourhood_slug}/${s.slug}`
        : `/${s.city_slug}/${s.slug}`;
    case "area":
      return `/${s.city_slug}/${s.slug}`;
    case "cuisine":
      return `/${citySlug}/cuisine/${s.slug}`;
    case "dietary":
      return `/${citySlug}/diet/${s.slug}`;
    case "dish": {
      // No per-dish page exists, so send the buyer to search with their words
      // and their location — the results are chefs who cook it.
      const params = new URLSearchParams({ q: s.label });
      if (loc) {
        params.set("lat", String(loc.lat));
        params.set("lng", String(loc.lng));
      }
      return `/search?${params.toString()}`;
    }
  }
}

/**
 * The single search box: kitchens, dishes, cuisines, dietary needs and areas,
 * all in one list — the Swiggy pattern, where a buyer types whatever noun is in
 * their head rather than learning our taxonomy first.
 */
export function OmniSearch({
  citySlug,
  location,
  autoFocus = false,
}: {
  citySlug: string;
  location: ChosenLocation | null;
  autoFocus?: boolean;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<SearchSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced fetch. Aborts in-flight requests so a fast typist doesn't get
  // results for a prefix they've already moved past.
  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/suggest?q=${encodeURIComponent(q)}&city=${encodeURIComponent(citySlug)}`,
          { signal: controller.signal },
        );
        if (!res.ok) return;
        const data: SearchSuggestion[] = await res.json();
        setResults(data);
        setActive(0);
        setOpen(true);
      } catch {
        /* aborted or offline — the box stays usable */
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [term, citySlug]);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(s: SearchSuggestion) {
    router.push(hrefFor(s, citySlug, location));
    setOpen(false);
  }

  function freeTextSearch() {
    const params = new URLSearchParams();
    if (term.trim()) params.set("q", term.trim());
    if (location) {
      params.set("lat", String(location.lat));
      params.set("lng", String(location.lng));
    }
    router.push(`/search?${params.toString()}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === "Enter") freeTextSearch();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const chosen = results[active];
      if (chosen) go(chosen);
      else freeTextSearch();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-3 shadow-sm focus-within:border-zuby-400">
        <span className="text-neutral-400" aria-hidden>
          🔍
        </span>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          autoFocus={autoFocus}
          placeholder={copy.home.searchPlaceholder}
          aria-label={copy.home.searchPlaceholder}
          role="combobox"
          aria-expanded={open}
          aria-controls="zuby-suggestions"
          className="w-full bg-transparent text-base text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
        />
        {loading && <span className="text-xs text-neutral-400">…</span>}
      </div>

      {open && results.length > 0 && (
        <ul
          id="zuby-suggestions"
          role="listbox"
          className="absolute z-30 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-lg"
        >
          {results.map((s, i) => (
            <li key={`${s.kind}-${s.slug}-${s.label}`}>
              <button
                type="button"
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(s)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ${
                  i === active ? "bg-neutral-100" : "hover:bg-neutral-50"
                }`}
              >
                <span className="text-lg" aria-hidden>
                  {KIND_ICON[s.kind]}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-neutral-900">
                    {s.label}
                  </span>
                  {s.sublabel && (
                    <span className="block truncate text-xs text-neutral-500">{s.sublabel}</span>
                  )}
                </span>
                {s.kind !== "chef" && s.result_count > 0 && (
                  <span className="shrink-0 text-xs text-neutral-400">
                    {copy.home.chefCount(s.result_count)}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
