import type { Metadata } from "next";
import { requireChefPage } from "@/lib/chef/auth";
import { copy } from "@/lib/copy/en";
import { FindKitchenSearch } from "@/components/dashboard/FindKitchenSearch";

export const metadata: Metadata = { title: "Find your kitchen — Zuby" };

export default async function FindKitchenPage() {
  await requireChefPage();
  const c = copy.claim;

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">{c.searchHeading}</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Search for your existing listing so you can claim and manage it.
      </p>
      <FindKitchenSearch />
    </main>
  );
}
