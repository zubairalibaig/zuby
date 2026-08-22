import { jsonLdScript } from "@/lib/seo/jsonld";

/** Renders one JSON-LD object as a script tag. Safe for Server Components. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(data) }} />
  );
}
