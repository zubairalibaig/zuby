# Cost controls — staying on free tiers

**Goal:** $0 hosting cost until either a year has passed or Zuby has real
revenue, whichever comes first (CLAUDE.md: "Cost stays near zero"). This
document is the concrete plan for that, written after the founder's past
experience with a different app's Supabase egress bill running away — the
photo-heavy shape of a chef directory is exactly the pattern that causes it,
so this isn't hypothetical.

---

## 1. The actual risk, named precisely

Free-tier billing scares people because "storage" sounds like the number to
watch. For a photo-heavy public site it almost never is. **Egress —
bandwidth out, every time an image is served to a browser — is the number
that actually moves.** A 1 MB photo stored once costs 1 MB of storage
forever. The same photo viewed 10,000 times costs 10 GB of egress in a
month, and a public directory's photos get viewed by every visitor who
lands on a listing, every crawler that indexes it, and every link preview a
buyer's WhatsApp forward generates. Storage grows with how many chefs join;
egress grows with how many people look — the second number is the one with
no natural ceiling.

Three things multiply together into a bill: **file size** (bytes per
image), **request count** (how many times it's fetched), and **cache
hit rate** (what fraction of those requests actually reach Supabase versus
get served from a cache in front of it). This document's changes attack all
three.

## 2. What's now enforced in code

**Every photo is resized and recompressed in the browser before it ever
reaches Supabase** (`src/lib/media/resizeImage.ts`, used by all four upload
sites: the chef dashboard's photo manager and menu editor, the onboarding
stepper, and the admin panel's uploader — previously four separate,
inconsistent copies of this logic). WebP first (smaller than JPEG at
equal visual quality), JPEG as a fallback for the few browsers that don't
support WebP canvas encoding. Caps are set against what the UI actually
displays, not a round "big enough" number:

| Use | Old cap | New cap | Where it's shown |
|---|---|---|---|
| Kitchen/food/chef photos, cover photo | 1200–1400px | **1000px** | ≤280px on the public profile, ≤200px in dashboards |
| Dish photos | 900px | **500px** | 64–80px everywhere |

A 4000×3000 phone-camera JPEG (often 3–6 MB) becomes roughly 80–250 KB at
these caps and quality settings — the exact multiplier depends on the
photo, but the size class drops by an order of magnitude, and every later
view of that photo costs proportionally less egress forever.

**Every upload sets a one-year `Cache-Control`**
(`IMMUTABLE_CACHE_CONTROL` in the same file, `31536000` seconds). This is
safe specifically because every upload path writes to a fresh `uuid`
filename with `upsert: false` — a given URL's content never changes, so
there's no staleness risk in caching it as close to forever as the header
allows. This is the single highest-leverage change here: a browser or CDN
that already has the file simply doesn't ask Supabase for it again.

**Next.js's own image-optimization cache is set to match**
(`next.config.ts`, `images.minimumCacheTTL: 31536000`). Its *default* is 60
seconds — meaning even with a correct Storage-side header, Vercel's edge
would still re-validate against Supabase roughly once a minute under real
traffic without this. Both settings do complementary jobs: the Storage
header controls direct fetches (crawlers, link-preview bots, anything not
going through `next/image`); the Next.js setting controls the optimized
variants actually served to browsers.

**Deleted or replaced photos now actually free the underlying file**
(`src/lib/supabase/storage.ts`, `deleteChefPhotoObject()`). This closes a
real gap: every delete/replace action — a chef removing a kitchen photo, an
admin removing one, a dish photo being replaced or cleared, a menu item
being deleted from either the chef or admin side — previously only removed
the *database row* pointing at the file, never the file itself. The RLS
policy needed to let an owner delete their own object already existed in
`supabase/ops.sql` (added in an earlier pass, with a comment noting exactly
this risk) but nothing in the app was calling it. Over a year of chefs
iterating on their photos, that's a slow, silent, one-directional leak
against the 1 GB storage cap — small per action, compounding indefinitely,
and invisible until the dashboard says you're out of room. It's fixed now,
not just flagged.

## 3. Vercel

**What's already good, structurally:** almost every public page uses ISR
(`revalidate = 600` or `3600`) rather than being fully dynamic, so most
traffic is served from Vercel's edge cache without invoking a serverless
function per request at all — that's the existing architecture doing the
right thing already, not a change made here.

**What to watch:** Image Optimization has its own free-tier allowance,
separate from bandwidth, measured in source images processed per month.
The cache-TTL fix in §2 is the direct mitigation — a source image that's
only ever transformed once (then served from cache for a year) uses the
allowance once, not once per visit. As chef count grows into the hundreds
with several photos each, this is the number to check first if anything
looks tight.

**Worth knowing, not urgent:** Vercel's Hobby (free) plan terms describe
it for personal/non-commercial use. Zuby is pre-revenue today, which is a
defensible position, but it's worth being aware that a for-profit product
gaining real traction is the kind of thing that eventually needs the Pro
plan regardless of how well bandwidth is controlled — that's a business
decision for the founder to make deliberately when the time comes, not
something code can route around.

**Ritual:** once a month, Vercel dashboard → the project → **Usage** tab.
Two numbers matter here: Fast Data Transfer (bandwidth) and Image
Optimization (source images transformed).

## 4. Cloudflare

Already effectively risk-free, and worth saying plainly rather than adding
anything: per `docs/dns-cloudflare-setup.md`, DNS records point at Vercel
in **DNS-only mode** (grey cloud, not proxied), for SSL/routing compatibility
reasons unrelated to cost. Cloudflare's free plan doesn't meter DNS
lookups at all, in either DNS-only or proxied mode — there's no bandwidth
bill on Cloudflare's side today, and there wouldn't be one if proxying were
enabled either, since Cloudflare's free tier itself doesn't charge for
proxied bandwidth. The only way Cloudflare costs anything is adding a paid
product (Workers paid tier, R2 beyond its free allowance, etc.), and
nothing in this codebase uses one.

*Optional, not needed for cost:* enabling the proxy (orange cloud) would
add a free CDN layer in front of Vercel, which could reduce origin load
further — genuinely a nice-to-have, not a requirement, and it means
revisiting whatever caused the "Invalid Configuration" issue that pushed
the setup to DNS-only in the first place. Leave this for later unless
there's a specific reason to revisit it.

## 5. Supabase database size

Not a live risk today. `photo_url` and every other image reference is a
short text URL, never a base64 blob — confirmed by reading every upload
path while making the changes above. The one column that grows
unboundedly over time is `events` (`wa_click` / `profile_view` rows,
appended on every WhatsApp click and profile view). At V1 traffic this is
nowhere near the 500 MB free-tier limit — each row is a handful of small
columns — but it has no retention policy, and it's the one table with no
natural ceiling. Worth a pruning job (e.g. drop rows older than 13 months,
past what `/admin/metrics`' 8-week trend needs) once traffic is high
enough that it's a real number, not before. Flagged here so it's a
deliberate decision later, not a surprise.

## 6. What actually happens if a limit is approached

Both platforms are built to degrade or warn, not silently bill an account
with no payment method on file — but check each platform's current billing
page directly rather than relying on this document for the exact
mechanics, since free-tier behaviour is exactly the kind of thing that
changes over time. The monthly ritual in §3 and §7 exists specifically so
"approaching a limit" is something noticed at 70%, not discovered at 100%.

## 7. Monthly ritual

Same discipline as `docs/seo-playbook.md`'s weekly SEO check — five minutes,
same day each month:

- [ ] **Supabase dashboard → Settings → Usage.** Storage and Egress, both
      compared to last month's number, not just the current total.
- [ ] **Vercel dashboard → project → Usage.** Fast Data Transfer and Image
      Optimization.
- [ ] **Supabase → Storage → `chef-photos`.** Spot-check that the bucket
      size is tracking chef/photo count roughly linearly, not spiking —
      a sudden jump with no matching growth in chefs would mean something
      in §2 broke.
- [ ] If any number is trending toward 70% of its limit, that's the signal
      to revisit this document's assumptions, not to wait for 100%.

---

*Written alongside a full audit of every photo upload/delete path in the
codebase — see the commit this shipped in for the complete list of what
changed and why.*
