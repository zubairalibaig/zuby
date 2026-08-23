import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { copy } from "@/lib/copy/en";
import { ClaimForm } from "./ClaimForm";
import { WhatsAppVerifyButton } from "./WhatsAppVerifyButton";

interface Props {
  params: Promise<{ chefId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { chefId } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("chefs")
    .select("kitchen_name")
    .eq("id", chefId)
    .maybeSingle();
  const name = data?.kitchen_name ?? "Kitchen";
  return { title: copy.claim.metaTitle(name) };
}

export default async function ClaimPage({ params }: Props) {
  const { chefId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/claim/${chefId}`);

  const { data: chef } = await supabase
    .from("chefs")
    .select("id, kitchen_name, slug, address_area, whatsapp_e164, claimed_by")
    .eq("id", chefId)
    .maybeSingle();
  if (!chef) notFound();

  const c = copy.claim;

  if (chef.claimed_by) {
    return (
      <main className="mx-auto max-w-lg px-6 py-10 text-center">
        <p className="text-lg font-medium text-neutral-900">{c.alreadyClaimed}</p>
      </main>
    );
  }

  // WhatsApp self-verify deep link: the chef sends this from the kitchen's own
  // phone, so the sender's number is the proof. Code is derived from the chef id
  // so it's stable across reloads and matches whatever the claim row recorded.
  const verifyCode = `ZUBY-${chefId.replace(/\D/g, "").slice(0, 4).padStart(4, "0")}`;
  const founderWa = process.env.NEXT_PUBLIC_FOUNDER_WHATSAPP_E164?.replace(/\D/g, "") ?? "";
  const waVerifyHref = founderWa
    ? `https://wa.me/${founderWa}?text=${encodeURIComponent(
        `Hi, I'm claiming ${chef.slug} on Zuby. Code: ${verifyCode}`,
      )}`
    : null;

  return (
    <main className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-2xl font-bold text-neutral-900">
        {c.heading(chef.kitchen_name)}
      </h1>
      {chef.address_area && (
        <p className="mt-1 text-sm text-neutral-500">{chef.address_area}</p>
      )}
      <p className="mt-2 text-neutral-600">{c.subheading}</p>

      {/* WhatsApp self-verification */}
      {waVerifyHref && (
        <div className="mt-8 rounded-xl border border-neutral-200 bg-white p-5 space-y-3">
          <h2 className="font-semibold text-neutral-900">{c.whatsappVerifyHeading}</h2>
          <p className="text-sm text-neutral-500">{c.whatsappVerifyBody}</p>
          <p className="rounded-lg bg-neutral-50 px-3 py-2 text-center font-mono text-sm text-neutral-700">
            Your code: {verifyCode}
          </p>
          <WhatsAppVerifyButton chefId={chefId} code={verifyCode} waHref={waVerifyHref} />
        </div>
      )}

      {/* Manual claim form */}
      <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-5">
        <h2 className="font-semibold text-neutral-900">{c.manualHeading}</h2>
        <p className="mt-1 text-sm text-neutral-500">{c.manualBody}</p>
        <ClaimForm chefId={chefId} />
      </div>
    </main>
  );
}
