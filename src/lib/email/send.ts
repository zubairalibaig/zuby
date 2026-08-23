import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Transactional email via Resend's REST API (Phase 4 scope §5).
 *
 * Deliberately dependency-free — a plain fetch against the documented endpoint,
 * not the `resend` npm package. Two reasons: one less dependency to keep current,
 * and the whole module no-ops cleanly when RESEND_API_KEY is unset, so the app
 * runs identically before the founder has verified a sending domain.
 *
 * Every send is best-effort. A failed email must never fail the admin action
 * that triggered it — the DB state is the source of truth, the email is a
 * courtesy on top.
 */

const RESEND_ENDPOINT = "https://api.resend.com/emails";

export interface SendResult {
  sent: boolean;
  reason?: string;
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://zuby.food";
}

function fromAddress(): string {
  return process.env.RESEND_FROM ?? "Zuby <hello@zuby.food>";
}

/** Look up an auth user's email address. */
export async function userEmail(userId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error) return null;
    return data.user?.email ?? null;
  } catch {
    return null;
  }
}

/** Look up the email of the auth user who owns a chef listing. */
export async function chefOwnerEmail(chefId: string): Promise<string | null> {
  try {
    const admin = createAdminClient();
    const { data: chef } = await admin
      .from("chefs")
      .select("claimed_by")
      .eq("id", chefId)
      .maybeSingle();
    if (!chef?.claimed_by) return null;
    return userEmail(chef.claimed_by);
  } catch {
    return null;
  }
}

async function send(to: string, subject: string, lines: string[]): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, reason: "RESEND_API_KEY not set" };

  const text = lines.join("\n\n");
  const html = lines.map((l) => `<p style="margin:0 0 16px;line-height:1.5">${l}</p>`).join("");

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: fromAddress(), to: [to], subject, text, html }),
    });
    if (!res.ok) {
      return { sent: false, reason: `Resend returned ${res.status}` };
    }
    return { sent: true };
  } catch (e) {
    return { sent: false, reason: e instanceof Error ? e.message : "fetch failed" };
  }
}

// ---------------------------------------------------------------------------
// The three Phase 4 emails. Copy stays short and warm; each one carries the
// chef's public URL so they have something to share.
// ---------------------------------------------------------------------------

export async function emailListingApproved(
  chefId: string,
  kitchenName: string,
  publicPath: string,
): Promise<SendResult> {
  const to = await chefOwnerEmail(chefId);
  if (!to) return { sent: false, reason: "no owner email" };
  const url = `${siteUrl()}${publicPath}`;
  return send(to, `${kitchenName} is live on Zuby 🎉`, [
    `Good news — ${kitchenName} is now live on Zuby.`,
    `Here's your page: ${url}`,
    "Share that link anywhere you already take orders — WhatsApp status, Instagram bio, your building group. Customers who tap the WhatsApp button land straight in your chat.",
    "You can update your menu, prices, photos and timings any time from your dashboard.",
  ]);
}

export async function emailChangesRequested(
  chefId: string,
  kitchenName: string,
  note: string,
): Promise<SendResult> {
  const to = await chefOwnerEmail(chefId);
  if (!to) return { sent: false, reason: "no owner email" };
  return send(to, `A quick change needed for ${kitchenName}`, [
    `We looked at ${kitchenName} and need one thing sorted before it goes live.`,
    note,
    `You can make the change here: ${siteUrl()}/dashboard`,
    "Reply to this email if anything is unclear — we're happy to help.",
  ]);
}

/**
 * Addressed to the claimant, not the listing owner — on a rejection nobody owns
 * the listing yet, so `claimed_by` is still null and there'd be no one to write to.
 */
export async function emailClaimDecision(
  claimantUserId: string,
  kitchenName: string,
  approved: boolean,
  publicPath: string | null,
): Promise<SendResult> {
  const to = await userEmail(claimantUserId);
  if (!to) return { sent: false, reason: "no claimant email" };

  if (approved) {
    const url = publicPath ? `${siteUrl()}${publicPath}` : `${siteUrl()}/dashboard`;
    return send(to, `You now manage ${kitchenName} on Zuby`, [
      `${kitchenName} is yours — the claim is approved.`,
      `Your page: ${url}`,
      `Manage your menu, photos, prices and timings from ${siteUrl()}/dashboard.`,
    ]);
  }

  return send(to, `About your claim for ${kitchenName}`, [
    `We couldn't confirm that you run ${kitchenName}, so we haven't transferred the listing.`,
    "This usually means the WhatsApp message didn't come from the number on the listing, or we needed more detail than the claim note gave us.",
    "Reply to this email with anything that proves the kitchen is yours and we'll take another look.",
  ]);
}

/**
 * Deliverability check for the founder: sends a real message through whatever
 * Resend config is live. Used by the admin diagnostics panel so setup can be
 * verified without faking an approval on a real listing.
 */
export async function emailTestSend(to: string): Promise<SendResult> {
  return send(to, "Zuby email is working", [
    "This is a test from your Zuby admin panel.",
    "If you're reading this, RESEND_API_KEY and your sending domain are set up correctly — chefs will receive approval, changes-requested and claim-decision emails.",
    `Site: ${siteUrl()}`,
  ]);
}
