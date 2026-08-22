import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/admin/auth";
import { getIngestCandidate } from "@/lib/admin/queries";
import { IngestActions } from "@/components/admin/IngestActions";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";

export default async function IngestDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>;
}) {
  const { candidateId } = await params;
  const { supabase } = await requireAdminPage();
  const candidate = await getIngestCandidate(supabase, candidateId);
  if (!candidate) notFound();

  const n = candidate.normalised;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <Link href="/admin/ingest" className="text-sm text-zuby-600 hover:underline">
          ← Candidates
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-xl font-bold text-neutral-900">{n.kitchen_name ?? "—"}</h1>
          <StatusBadge status={candidate.status} />
        </div>

        {n.duplicate_of && (
          <div className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Possible duplicate: {n.duplicate_of.detail}
          </div>
        )}
        {n.unmapped && n.unmapped.length > 0 && (
          <div className="mt-3 rounded-md bg-orange-50 px-3 py-2 text-sm text-orange-800">
            Unmapped values (an admin decides): {n.unmapped.join(", ")}
          </div>
        )}

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
          <Detail label="Chef name" value={n.display_name} />
          <Detail label="WhatsApp" value={n.whatsapp_e164} />
          <Detail label="Phone" value={n.phone_e164} />
          <Detail label="Instagram" value={n.instagram_handle} />
          <Detail label="Neighbourhood" value={n.neighbourhood_slug} />
          <Detail label="Area" value={n.address_area} />
          <Detail label="Geo source" value={n.geo_source} />
          <Detail label="FSSAI" value={n.fssai_number} />
          <Detail label="Cuisines" value={n.cuisine_slugs?.join(", ") ?? null} />
          <Detail label="Dietary tags" value={n.dietary_tag_slugs?.join(", ") ?? null} />
          <Detail label="Source" value={n.source} />
        </dl>

        {n.bio && <p className="mt-3 text-sm text-neutral-600">{n.bio}</p>}

        <details className="mt-4">
          <summary className="cursor-pointer text-xs font-medium text-neutral-500">
            Raw source data
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-md bg-neutral-900 p-3 text-xs text-neutral-100">
            {JSON.stringify(candidate.raw, null, 2)}
          </pre>
        </details>
      </div>

      <div className="space-y-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <IngestActions candidateId={candidate.id} status={candidate.status} />
        </div>
        {n.source_url && (
          <a
            href={n.source_url}
            target="_blank"
            rel="noreferrer"
            className="block rounded-md border border-neutral-300 px-3 py-2 text-center text-sm font-medium text-neutral-600 hover:bg-neutral-100"
          >
            Open source ↗
          </a>
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-neutral-400">{label}</dt>
      <dd className="text-neutral-800">{value ?? "—"}</dd>
    </div>
  );
}
