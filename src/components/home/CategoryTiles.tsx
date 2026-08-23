import Link from "next/link";

/**
 * The craving row. Warm gradient discs rather than grey circles — a grey circle
 * with an emoji in it reads as a wireframe placeholder, which was most of why
 * the first version of this page felt unfinished. Colour is what makes a
 * category tile look like a product decision instead of a TODO.
 */

export interface Tile {
  label: string;
  href: string;
  emoji: string;
  /** Tailwind gradient classes, cycled when the caller doesn't set one. */
  tone?: string;
}

const TONES = [
  "from-orange-100 to-amber-200",
  "from-rose-100 to-orange-200",
  "from-amber-100 to-yellow-200",
  "from-lime-100 to-emerald-200",
  "from-red-100 to-rose-200",
  "from-emerald-100 to-teal-200",
  "from-yellow-100 to-orange-200",
  "from-fuchsia-100 to-rose-200",
];

export function CategoryTiles({ tiles }: { tiles: Tile[] }) {
  if (tiles.length === 0) return null;

  return (
    <div className="no-scrollbar -mx-5 overflow-x-auto px-5 pb-2">
      <div className="flex gap-4 sm:flex-wrap sm:gap-5">
        {tiles.map((tile, i) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group flex w-[4.75rem] shrink-0 flex-col items-center gap-2 sm:w-[5.5rem]"
          >
            <span
              className={`flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-full bg-gradient-to-br text-3xl shadow-sm ring-1 ring-inset ring-black/[0.04] transition duration-200 group-hover:-translate-y-1 group-hover:shadow-md sm:h-[5.5rem] sm:w-[5.5rem] sm:text-4xl ${
                tile.tone ?? TONES[i % TONES.length]
              }`}
            >
              {tile.emoji}
            </span>
            <span className="text-center text-xs font-semibold leading-tight text-sand-700 transition group-hover:text-zuby-700">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
