# Connecting zuby.food — Cloudflare DNS + Vercel + HTTPS

Goal: `zuby.food` **and** `www.zuby.food` both serve the live Vercel deployment over HTTPS, with one of them redirecting to the other (so Google never sees two copies of the same site). Everything below is done in three dashboards — Cloudflare, your domain registrar, and Vercel — no CLI needed.

**Current state:** `zuby.food` resolves to `15.197.148.33` / `3.33.130.190` — these are your **registrar's parking/forwarding IPs**, not Vercel. Nothing points at your app yet.

Budget 15–20 minutes of active work, then up to 24 hours of waiting for DNS to propagate worldwide (often much faster — sometimes minutes).

---

## Step 0 — Find out who your registrar is

This is wherever you actually *bought* zuby.food (GoDaddy, Namecheap, Google Domains, BigRock, etc. — check your email for the purchase receipt if unsure). You'll need to log into that account once, in Step 2.

---

## Step 1 — Add the site to Cloudflare

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) → sign up / log in (free).
2. **Add a site** → type `zuby.food` → choose the **Free** plan.
3. Cloudflare scans your domain's existing DNS records and shows you what it found. **Check this list carefully for any `MX` records** (email) — if you send or receive email at `@zuby.food` today, those records must carry over. If the scan missed something you know exists, add it manually now, before continuing.
4. Continue. Cloudflare now shows you **two nameservers** (something like `ada.ns.cloudflare.com` and `bob.ns.cloudflare.com`). Copy them — you need them in the next step.

---

## Step 2 — Point your domain at Cloudflare (at your registrar)

1. Log into your **registrar** (wherever you bought zuby.food).
2. Find the domain's **nameserver / DNS settings** (often called "Nameservers," "Custom DNS," or "DNS Management").
3. Replace whatever nameservers are currently listed with the **two Cloudflare nameservers** from Step 1.
4. Save.

This is the one step that takes time to spread across the internet (DNS propagation) — usually 15 minutes to a few hours, occasionally up to 24 hours. Cloudflare emails you once it detects the switch is active; you can also check anytime on the Cloudflare dashboard's Overview page, which shows "Status: Active" once it's live.

**Don't do anything else until Cloudflare shows Active.**

---

## Step 3 — Add the domain in Vercel

1. Vercel dashboard → your `zuby` project → **Settings → Domains**.
2. Add `zuby.food`. Vercel will show you a DNS record to create — typically:
   - **Type:** `A`, **Name:** `@`, **Value:** an IP address (commonly `76.76.21.21`, but **always copy the exact value Vercel shows you** — it can differ).
3. Add `www.zuby.food` too. Vercel will show a second record — typically:
   - **Type:** `CNAME`, **Name:** `www`, **Value:** `cname.vercel-dns.com`
4. In Vercel, set **one of the two as the primary domain** (Vercel's UI has a "redirect to" option) — the other will 308-redirect to it automatically once both resolve correctly. Either choice is fine for SEO as long as it's consistent; `zuby.food` (no `www`) is the simpler, more common choice.
5. Leave this Vercel screen open — you'll come back to confirm it turns green.

---

## Step 4 — Create the DNS records in Cloudflare

1. Cloudflare dashboard → your zuby.food site → **DNS → Records**.
2. **Add record 1:**
   - Type: `A`
   - Name: `@`
   - IPv4 address: *the exact value Vercel showed you in Step 3*
   - Proxy status: click the orange cloud icon to turn it **grey ("DNS only")** for now — important, see Step 5.
3. **Add record 2:**
   - Type: `CNAME`
   - Name: `www`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **grey ("DNS only")** for now, same reason.
4. Save both.

> **Why "DNS only" first, not proxied (orange cloud)?** Vercel needs to issue a free SSL certificate (via Let's Encrypt) for your domain, and that process is simplest and most reliable when Cloudflare is just passing DNS through rather than sitting in front as a proxy. Once the certificate is confirmed issued (Step 6), you can safely switch to proxied for Cloudflare's caching/WAF benefits (Step 7) — that's the standard, well-tested order.

---

## Step 5 — Set Cloudflare's SSL mode correctly (do this now, don't skip)

1. Cloudflare dashboard → your site → **SSL/TLS** (left sidebar).
2. Set the encryption mode to **Full (strict)**.
3. **Do not use "Flexible."** Flexible mode makes Cloudflare talk to Vercel over plain HTTP, but Vercel always redirects HTTP → HTTPS — the two together create an infinite redirect loop and your site will refuse to load. This is the single most common mistake in this setup; setting Full (strict) now avoids it entirely later.

---

## Step 6 — Confirm Vercel issued the certificate

1. Go back to the Vercel **Settings → Domains** screen from Step 3.
2. Wait a few minutes, then refresh. Both `zuby.food` and `www.zuby.food` should show a green checkmark / "Valid Configuration."
   - If a domain is stuck "Invalid Configuration," double-check the DNS record values in Cloudflare exactly match what Vercel asked for (typos in the IP/CNAME target are the usual cause), and that DNS has finished propagating (Step 2).
3. Once both are green, HTTPS is live: `https://zuby.food` and `https://www.zuby.food` both serve your app, with one redirecting to the other.

---

## Step 7 — (Optional but recommended) Turn on Cloudflare's proxy

Now that HTTPS is confirmed working end-to-end:

1. Cloudflare → **DNS → Records** → click the grey cloud icon next to both the `A` and `CNAME` records to turn them **orange ("Proxied")**.
2. This is what actually gives you the benefits `ARCHITECTURE.md` counts on — Cloudflare's CDN caching and basic bot/WAF protection in front of Vercel — at no cost.
3. Because Full (strict) is already set (Step 5), this switch is safe and shouldn't break anything. If something looks wrong immediately after, switch back to "DNS only" and re-check Step 5's SSL mode.

---

## Step 8 — Verify from outside

Once Step 6 shows green:

- Open `https://zuby.food` in a normal browser (or an incognito window, to skip any cached redirect) — should load the Zuby site with a padlock (valid HTTPS).
- Open `https://www.zuby.food` — should also load, likely after a redirect to your chosen primary domain.
- Open `http://zuby.food` (no `s`) — should redirect to `https://zuby.food` automatically (Vercel does this by default).

If all three work, you're fully done — tell me and I'll double check `/api/health` and the live pages render correctly.

---

## If something's stuck

- **Vercel shows "Invalid Configuration" for over an hour:** re-check the exact record values (Cloudflare vs. what Vercel currently asks for — Vercel occasionally updates the expected IP, so re-copy it rather than trusting this document's example value).
- **"Too many redirects" error in the browser:** you're in Flexible SSL mode — go back to Step 5 and set Full (strict).
- **Email stopped working after switching nameservers:** the `MX` records didn't carry over in Step 1 — add them manually in Cloudflare DNS (same values your registrar had), matching your email provider's documentation (e.g. Google Workspace, Zoho Mail).

---

## Update — resolving "Invalid Configuration" + "Proxy Detected" (the real-world path)

After the nameserver switch, two things commonly still show red in Vercel. Here's
the tested fix, and it supersedes Steps 4–7 above where they differ.

### Keep the app's DNS records "DNS only" (grey cloud), not proxied

Vercel explicitly warns when Cloudflare's orange-cloud proxy sits in front of it
("Proxy Detected") — it breaks Vercel's DDoS/bot mitigation and, combined with
Vercel's forced HTTPS, is the classic redirect-loop trap. The simplest reliable
setup is to leave Cloudflare as **pure DNS** for the Vercel records:

- `zuby.food` A → `76.76.21.21` — **DNS only (grey)**
- `www.zuby.food` CNAME → `zuby.food` — **DNS only (grey)**

Vercel's own CDN (included on Hobby) still serves pages fast; you only forgo
Cloudflare's WAF, which isn't needed at launch. To use Cloudflare's proxy later,
re-enable orange cloud **only after** setting SSL/TLS to **Full (strict)**.

### Use the legacy A record, ignore the new CNAME recommendation

Vercel is migrating to per-project targets like
`d2915ef4…vercel-dns-017.com`, but its UI notes the **legacy `76.76.21.21` A
record still works** — and an apex A record is simpler than apex-CNAME
flattening. Keep the A record; you don't need to add a CNAME.

### Delete stale registrar parking records

If Cloudflare imported the old GoDaddy forwarding A records
(e.g. `15.197.148.33`, `3.33.130.190`), **delete them** — with proxy on,
Cloudflare round-robins to all A-record origins, so any non-Vercel IP breaks a
share of requests and keeps Vercel on "Invalid Configuration."

### Apex is primary, www redirects (matches the code)

The codebase's canonical URLs (`metadataBase`, sitemap, robots, JSON-LD) are all
`https://zuby.food` with **no www**. So in Vercel → Settings → Domains, set
`zuby.food` as the **primary** and `www.zuby.food` to **redirect to it** — not
the reverse — or Google gets a canonical/redirect mismatch. Keep
`NEXT_PUBLIC_SITE_URL=https://zuby.food`.

Final DNS records for the app (besides email/`_dmarc`/`_domainconnect`):

| Type | Name | Value | Proxy |
|---|---|---|---|
| A | `@` (zuby.food) | `76.76.21.21` | DNS only |
| CNAME | `www` | `zuby.food` | DNS only |
