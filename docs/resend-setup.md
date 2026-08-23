# Resend setup — what you need to do

Everything on the code side is built and merged. This document is the list of
things only you can do, because they need account access and DNS.

Nothing here is urgent-blocking: with `RESEND_API_KEY` unset, every chef email is
silently skipped and the rest of Zuby behaves identically. But **step 2 matters
more than it looks** — see the warning there.

---

## Why there are two separate jobs

Zuby sends two different kinds of email, and they are configured in different places:

| | What it sends | Configured in | Breaks if not done |
|---|---|---|---|
| **A. Transactional** | Listing approved, changes requested, claim decision | Vercel env vars | Chefs never hear back after review. Annoying, not fatal. |
| **B. Auth (login codes)** | The 6-digit email OTP chefs sign in with | Supabase dashboard | **Chef login stops working past ~4 emails/hour.** |

Job B is the one to prioritise. Supabase's built-in email sender is rate-limited
to a handful of messages per hour on the free tier and is meant for development
only — it is not a login system for real users. Pointing Supabase at Resend fixes
this.

Both jobs share the same Resend account and the same verified domain, so do
step 1 once and it serves both.

---

## Step 1 — Create the Resend account and verify zuby.food

1. Sign up at **resend.com**. The free tier is 3,000 emails/month and 100/day —
   far past what Zuby needs at launch. No card required. This keeps us inside the
   "cost stays near zero" rule in `CLAUDE.md`.
2. Go to **Domains → Add Domain** and enter `zuby.food`.
3. Resend shows you a set of DNS records — typically:
   - a `TXT` record for **SPF** (on `send.zuby.food` or the apex)
   - a `TXT` record for **DKIM** (on `resend._domainkey`)
   - optionally a `TXT` for **DMARC** on `_dmarc`
4. Add each one in **Cloudflare → zuby.food → DNS**. Two things to get right:
   - Set every one of these records to **DNS only** (grey cloud, not orange).
     Proxying breaks TXT verification. This is the same rule as in
     `docs/dns-cloudflare-setup.md`.
   - Copy the record *name* exactly as Resend gives it. Cloudflare appends
     `.zuby.food` automatically, so if Resend says `resend._domainkey.zuby.food`,
     enter just `resend._domainkey`.
5. Back in Resend, click **Verify**. It usually goes green in a few minutes;
   Cloudflare propagation can take up to an hour.

**Add DMARC even though it's optional.** Gmail and Yahoo require it for bulk
senders and increasingly penalise domains without it. Start permissive so you
don't silently lose mail while things settle:

```
Name:  _dmarc
Type:  TXT
Value: v=DMARC1; p=none; rua=mailto:zubairalibaig@gmail.com
```

Once you've watched the reports for a few weeks with no surprises, tighten `p=none`
to `p=quarantine`.

---

## Step 2 — Point Supabase Auth at Resend (do this one first)

This is what makes chef login reliable.

1. In Resend, go to **API Keys → Create API Key**. Name it `zuby-smtp`, give it
   **Sending access**. Copy the key — it is shown once.
2. In the Supabase dashboard: **Project Settings → Authentication → SMTP Settings**,
   and turn on **Enable Custom SMTP**.
3. Fill in:
   ```
   Host:        smtp.resend.com
   Port:        465
   Username:    resend
   Password:    <the API key from step 2.1>
   Sender email: hello@zuby.food
   Sender name:  Zuby
   ```
4. Save, then go to **Authentication → Rate Limits** and raise the email rate limit
   (it defaults to something like 4/hour for the built-in sender — that default is
   the actual thing breaking login at volume).
5. While you're in Auth settings, check **URL Configuration**:
   - **Site URL**: `https://zuby.food`
   - **Redirect URLs** must include `https://zuby.food/auth/callback`
   Google OAuth and the OTP flow both bounce through that path.

### Worth doing: rewrite the OTP email template

**Authentication → Email Templates → Magic Link.** The default template leads with
a magic-link button, but Zuby's login screen asks for a typed 6-digit code, so a
chef gets an email that doesn't match the screen in front of them. Put the code first:

```html
<h2>Your Zuby sign-in code</h2>
<p>Enter this code to sign in:</p>
<p style="font-size:32px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>The code expires in an hour. If you didn't ask for it, ignore this email.</p>
```

`{{ .Token }}` is the 6-digit code. Keep the word "Zuby" in the subject line —
chefs will be scanning a crowded inbox on a phone.

---

## Step 3 — Transactional email env vars

1. Create a second Resend API key (**Sending access**), named `zuby-transactional`.
   Separate keys mean you can revoke one without taking down login.
2. In **Vercel → zuby → Settings → Environment Variables**, add to
   **Production** (and Preview, if you test there):
   ```
   RESEND_API_KEY  = re_xxxxxxxxxxxx
   RESEND_FROM     = Zuby <hello@zuby.food>
   ```
   `RESEND_FROM` must be on the domain you verified in step 1, or Resend rejects
   the send.
3. **Redeploy.** Vercel only picks up new env vars on a fresh build — an existing
   deployment will keep behaving as if the key is unset.

---

## Step 4 — Verify it works

1. Hit `https://zuby.food/api/health`. It should report:
   ```json
   { "ok": true, "db": "ok", "email": "configured" }
   ```
   If `email` still says `not-configured`, the redeploy in step 3 didn't happen.
2. Sign in to `/admin`. At the bottom of the dashboard there's a **Chef email**
   panel with a **Send test email** button — it sends a real message to your admin
   address through the live config. Use that rather than approving a real listing
   to find out whether email works.
3. Test login properly: open `/login` in a private window, enter an email you
   control, confirm the code arrives and reads like the template from step 2.

---

## What sends when

| Trigger | Email | Goes to |
|---|---|---|
| Admin approves a listing | "Your kitchen is live" + public URL to share | Listing owner |
| Admin requests changes | The admin's note + dashboard link | Listing owner |
| Admin approves a claim | "You now manage this kitchen" + URL | Claimant |
| Admin rejects a claim | Why, and how to follow up | Claimant |
| Chef signs in | 6-digit OTP code | Whoever is signing in |

The first four come from `src/lib/email/send.ts`; the last is Supabase Auth.

Two deliberate design choices in that module: it calls Resend's REST API with a
plain `fetch` rather than pulling in the `resend` npm package (one less dependency
to keep current), and **a failed send never fails the admin action that triggered
it**. If Resend is down when you approve a chef, the chef still goes live and only
the notification is lost — the database is the source of truth, the email is a
courtesy on top.

---

## If email isn't arriving

- **`/api/health` says `not-configured`** — env var missing, or you didn't redeploy.
- **Test button says "Resend returned 403"** — the `RESEND_FROM` domain isn't
  verified, or the API key lacks sending access.
- **Test button says "Resend returned 422"** — `RESEND_FROM` is malformed. It needs
  the `Name <address>` shape, e.g. `Zuby <hello@zuby.food>`.
- **Login codes stop after a few** — Supabase is still on its built-in sender.
  Redo step 2; check custom SMTP is actually toggled on.
- **Mail lands in spam** — usually DKIM not verified or DMARC missing. Recheck
  step 1, and confirm those DNS records are grey-cloud in Cloudflare.
- **Nothing at all, no error** — a chef only gets email if their account has an
  address. A scraped listing that nobody has claimed has no owner to write to;
  the send is skipped and logged as "no owner email". That's expected.
