import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireChefPage } from "@/lib/chef/auth";
import { copy } from "@/lib/copy/en";

export const metadata: Metadata = { title: "Get started — Zuby" };

export default async function DashboardStartPage() {
  const { chefId } = await requireChefPage();
  // If user already has a listing, go to the real dashboard.
  if (chefId) redirect("/dashboard");

  const c = copy.onboarding;

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-bold text-neutral-900">{c.heading}</h1>
      <p className="mt-1 text-neutral-500">{c.subheading}</p>

      <div className="mt-8 grid w-full gap-4 sm:grid-cols-2">
        <Link
          href="/dashboard/find"
          className="rounded-xl border-2 border-neutral-200 p-6 text-left hover:border-zuby-500 hover:shadow-sm transition-all"
        >
          <span className="text-2xl">🔍</span>
          <p className="mt-2 font-semibold text-neutral-900">{c.findKitchen}</p>
          <p className="mt-1 text-sm text-neutral-500">{c.findKitchenDesc}</p>
        </Link>
        <Link
          href="/dashboard/create"
          className="rounded-xl border-2 border-neutral-200 p-6 text-left hover:border-zuby-500 hover:shadow-sm transition-all"
        >
          <span className="text-2xl">🏠</span>
          <p className="mt-2 font-semibold text-neutral-900">{c.listKitchen}</p>
          <p className="mt-1 text-sm text-neutral-500">{c.listKitchenDesc}</p>
        </Link>
      </div>
    </main>
  );
}
