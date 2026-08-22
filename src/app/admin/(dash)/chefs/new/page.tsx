import Link from "next/link";
import { requireAdminPage } from "@/lib/admin/auth";
import { getRefData } from "@/lib/admin/queries";
import { CreateChefForm } from "@/components/admin/CreateChefForm";

export const dynamic = "force-dynamic";

export default async function NewChefPage() {
  const { supabase } = await requireAdminPage();
  const ref = await getRefData(supabase);

  return (
    <div>
      <Link href="/admin/chefs" className="text-sm text-zuby-600 hover:underline">
        ← Chefs
      </Link>
      <h1 className="mt-3 text-lg font-semibold text-neutral-900">Create chef</h1>
      <p className="mb-6 mt-1 text-sm text-neutral-500">
        Creates a draft. Fill in the rest on the editor, then submit it to the queue.
      </p>
      <CreateChefForm ref={ref} />
    </div>
  );
}
