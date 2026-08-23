import Link from "next/link";
import type { Crumb } from "@/lib/seo/jsonld";

export function Breadcrumbs({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-sand-500">
      <ol className="flex flex-wrap items-center gap-1">
        {crumbs.map((crumb, index) => (
          <li key={crumb.path} className="flex items-center gap-1">
            {index > 0 && <span aria-hidden="true">/</span>}
            {index === crumbs.length - 1 ? (
              <span className="text-sand-700">{crumb.name}</span>
            ) : (
              <Link href={crumb.path} className="hover:text-zuby-600">
                {crumb.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
