import Link from "next/link";
import { redirect } from "next/navigation";
import { requireChefPage } from "@/lib/chef/auth";
import { SignOutButton } from "@/components/admin/SignOutButton";
import { copy } from "@/lib/copy/en";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/dashboard", label: copy.dashboard.nav.overview },
  { href: "/dashboard/menu", label: copy.dashboard.nav.menu },
  { href: "/dashboard/timings", label: copy.dashboard.nav.timings },
  { href: "/dashboard/photos", label: copy.dashboard.nav.photos },
  { href: "/dashboard/profile", label: copy.dashboard.nav.profile },
];

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, chefId } = await requireChefPage();

  // If user has no listing yet, redirect to the onboarding chooser.
  if (!chefId) redirect("/dashboard/start");

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-4 overflow-x-auto">
            <Link href="/dashboard" className="shrink-0 font-bold text-zuby-900">
              Zuby
            </Link>
            <nav className="flex gap-1">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="shrink-0 rounded-md px-3 py-1.5 text-sm font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-neutral-500">
            <span className="hidden sm:inline">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">{children}</main>
    </div>
  );
}
