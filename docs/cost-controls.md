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

### The three paths images actually leave Supabase by

Not all egress is equal, and the distinction is what makes this tractable:

| Path | Who fetches | Cached by us? | Scales with |
|---|---|---|---|
| **A.** `next/image` source pulls | Vercel's optimizer | Yes — 1 year (§2) | Number of *images* |
| **B.** `og:image` on a share | WhatsApp, Slack, FB, Twitter | **No — direct hit** | Number of *shares* |
| **C.** JSON-LD `image` | Googlebot / Google Images | Crawler-side only | Crawl schedule |

**A is bounded and safe.** It scales with how many photos exist, not how
many people look, because Vercel caches the source. At 200 chefs × 6 photos
(~140 MB of stored images), even re-pulled across several Vercel regions
annually, that's roughly 47 MB/month — **under 1%** of a 5 GB monthly
allowance.

**B was the real danger, and it scales with success.** It is the only path
where one extra visitor genuinely means one more full-size fetch out of
Supabase, and Zuby's whole distribution model is WhatsApp forwards
(`CONCEPT.md`). At ~120 KB per fetch, roughly **44,000 share-unfurls a
month would exhaust the entire egress tier on its own** — and a directory
that's working would get there. This is the shape of bill that arrives
suddenly rather than gradually, and it's the one that was live in this
codebase until the fix in §2.

**C is left as-is deliberately.** It's bounded by Googlebot's crawl
schedule rather than by user behaviour, it doesn't multiply when a link
goes around a WhatsApp group, and exposing the real dish photo is the
entire point of the Google Images play in
`docs/discoverability-strategy.md` §15. Trading that away to save a
rounding error of bandwidth would be the wrong call.

## 2. What's now enforced in code

### The `og:image` leak (path B) — the important one

`generateMetadata` on the chef profile set
`openGraph.images` to **the raw Supabase Storage URL**. Every WhatsApp
forward, Slack unfurl, Facebook and Twitter share, and social crawler
re-check therefore pulled the full image directly out of Supabase — never
touching Vercel's optimizer, never touching any cache this codebase
controls.

The same line broke the branded share card in a second, non-obvious way.
Next merges the file-convention `opengraph-image.tsx` only when the
returned metadata does **not** have an `images` key, and the check is
`openGraph.hasOwnProperty('images')` (see
`next/dist/lib/metadata/resolve-metadata.js`). `hasOwnProperty` is **true
for a key explicitly set to `undefined`** — verified directly. So
`images: chef.photoUrl ? [chef.photoUrl] : undefined` meant:

- chef **with** a cover photo → `og:image` = raw Supabase URL (the leak)
- chef **without** one → `images: undefined`, key present, card suppressed
  → **no `og:image` at all**

The nicely-designed 1200×630 card built in Phase 5 was therefore never
served for any chef. **Fix: omit the `images` key entirely.** The generated
card now wins in both cases — it renders from Vercel's edge, costs Supabase
nothing per share, works for chefs with no photo yet, and is better
branding than a bare cropped food photo. Strictly better on cost,
correctness and marketing at once.

### The rest

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
separate from bandwidth, and it is metered per *transformation* — each
distinct width of each source image counts. Two mitigations are in place:

- The cache-TTL fix in §2 — a source image transformed once and then served
  from cache for a year uses the allowance once, not once per visit.
- `imageSizes` / `deviceSizes` in `next.config.ts` are trimmed to what the
  UI can actually use. Every `sizes` prop on the site is 64px, 112px or
  200px, so the stock ceilings (384 for `imageSizes`, **3840** for
  `deviceSizes`) could only ever produce upscaled variants of a source
  image that is itself capped at 1000px — burning transformation quota to
  generate something visibly worse. Capped at 384/1080 respectively, which
  still covers a 200px slot on a 3x phone screen. **Widen these again if a
  full-bleed hero image is ever added** — there is none today (the home
  hero is CSS gradients, not an image).

This is the Vercel number to check first if anything looks tight, since
bandwidth is comfortably covered by the ISR/static posture above.

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

### The escape hatch, deliberately not built yet

If Supabase egress ever *does* start climbing, the structural fix is to put
Cloudflare's free CDN directly in front of Supabase Storage — serve photos
from an `img.zuby.food` hostname that Cloudflare proxies and caches, so
Supabase serves each image roughly once per edge location rather than once
per cache-miss. Combined with the 1-year `Cache-Control` already set on
every upload, that drives Supabase image egress to approximately zero
permanently, at no cost (Cloudflare's free plan does not meter proxied
bandwidth).

**This is not built, on purpose.** Per §1 the normal browsing path is under
1% of the allowance once path B is closed, so building it today would add
real moving parts — a hostname, a Host-header rewrite or a Worker, since
Supabase Storage will not answer to an arbitrary `Host` — to solve a
problem that no longer exists. That is exactly the kind of pre-emptive
infrastructure `CLAUDE.md` says to avoid.

**Concrete trigger to build it:** Supabase egress crossing ~40% of the
monthly allowance (≈2 GB) in the §7 check, two months running. At that
point the work is a half-day and this section is the starting point.

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
