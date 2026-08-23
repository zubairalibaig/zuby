import Link from "next/link";

/**
 * Swiggy's "What's on your mind" row: big tappable tiles that let a buyer start
 * from a craving rather than from a search box. Horizontally scrollable on
 * mobile, wrapped on desktop.
 */

export interface Tile {
  label: string;
  href: string;
  emoji: string;
  count?: number;
}

export function CategoryTiles({ tiles }: { tiles: Tile[] }) {
  if (tiles.length === 0) return null;

  return (
    <div className="-mx-6 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="flex gap-3 sm:flex-wrap">
        {tiles.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group flex w-[5.5rem] shrink-0 flex-col items-center gap-2 sm:w-24"
          >
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 text-3xl transition group-hover:bg-zuby-50 group-hover:ring-2 group-hover:ring-zuby-200 sm:h-24 sm:w-24 sm:text-4xl">
              {tile.emoji}
            </span>
            <span className="text-center text-xs font-medium leading-tight text-neutral-700 group-hover:text-zuby-600">
              {tile.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
