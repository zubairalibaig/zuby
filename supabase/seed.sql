-- Phase 0 seed data. Idempotent (fixed UUIDs + on conflict do nothing).
-- Demo chefs are clearly-named fiction ("Demo Kitchen — …") with fake contact
-- numbers, so Phase 1 can be built against real-shaped data. Remove them
-- before public launch (delete from chefs where kitchen_name like 'Demo Kitchen%').

-- ---------- countries ----------
insert into public.countries (id, code, name, currency_code, phone_prefix, is_active) values
  ('00000000-0000-4000-8000-000000000001', 'IN', 'India', 'INR', '+91', true),
  ('00000000-0000-4000-8000-000000000002', 'SG', 'Singapore', 'SGD', '+65', false)
on conflict (id) do nothing;

-- ---------- cities ----------
-- The five below (is_active = false) are the Tier-1 pan-India rollout targets
-- named in docs/discoverability-strategy.md §13. They exist as real rows —
-- CLAUDE.md: "countries and cities are first-class DB entities" — but stay
-- inactive until each crosses the documented 20-chefs/3-neighbourhoods gate.
-- getActiveCities() (src/lib/supabase/queries.ts) filters on is_active, so
-- none of the ordinary directory surfaces (search, sitemap-of-listings,
-- location picker) ever see them. Until a real launch, /<slug> renders the
-- honest "coming soon" branch of src/app/(site)/[city]/page.tsx instead of a
-- directory with nothing in it — see getComingSoonCities().
insert into public.cities (id, country_id, slug, name, center, timezone, is_active) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001',
   'bangalore', 'Bangalore',
   extensions.st_setsrid(extensions.st_makepoint(77.5946, 12.9716), 4326)::extensions.geography,
   'Asia/Kolkata', true),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000001',
   'delhi-ncr', 'Delhi NCR',
   extensions.st_setsrid(extensions.st_makepoint(77.2090, 28.6139), 4326)::extensions.geography,
   'Asia/Kolkata', false),
  ('00000000-0000-4000-8000-000000000103', '00000000-0000-4000-8000-000000000001',
   'mumbai', 'Mumbai',
   extensions.st_setsrid(extensions.st_makepoint(72.8777, 19.0760), 4326)::extensions.geography,
   'Asia/Kolkata', false),
  ('00000000-0000-4000-8000-000000000104', '00000000-0000-4000-8000-000000000001',
   'hyderabad', 'Hyderabad',
   extensions.st_setsrid(extensions.st_makepoint(78.4867, 17.3850), 4326)::extensions.geography,
   'Asia/Kolkata', false),
  ('00000000-0000-4000-8000-000000000105', '00000000-0000-4000-8000-000000000001',
   'chennai', 'Chennai',
   extensions.st_setsrid(extensions.st_makepoint(80.2707, 13.0827), 4326)::extensions.geography,
   'Asia/Kolkata', false),
  ('00000000-0000-4000-8000-000000000106', '00000000-0000-4000-8000-000000000001',
   'pune', 'Pune',
   extensions.st_setsrid(extensions.st_makepoint(73.8567, 18.5204), 4326)::extensions.geography,
   'Asia/Kolkata', false)
on conflict (id) do nothing;

-- ---------- neighbourhoods (real centroids) ----------
-- The original 7 below shipped with Phase 1. The 77 appended after them
-- (Central/North/East/South/West) close a real gap: with only 7 areas for a
-- city of ~13M, the location picker and neighbourhood pages had almost
-- nothing to offer most chefs or buyers, which is most of why "set your
-- location" read as broken rather than merely sparse.
--
-- Sourcing, stated plainly: these are locality-centroid approximations
-- compiled from general geographic knowledge and cross-checked against
-- public locality/zone listings — not pulled from a geocoding API. Both
-- direct page fetches and a bulk Nominatim/OSM lookup were tried first and
-- blocked by this environment's network egress policy; see the commit this
-- shipped in. That's the same precision class as the original 7 (also
-- hand-entered, not API-verified) and it's the right amount of precision for
-- what a centroid actually gates here: a starting point for radius search
-- and a name in a picker. A chef's own declared service_radius_km is what
-- actually decides who's shown (search_chefs()), so a centroid being off by
-- a few hundred metres changes nothing about correctness. Spot-correct any
-- individual row with a plain UPDATE as local knowledge comes in — no
-- migration needed, this table has no other table depending on exact values.
insert into public.neighbourhoods (id, city_id, slug, name, center) values
  ('00000000-0000-4000-8000-000000000201', '00000000-0000-4000-8000-000000000101', 'indiranagar', 'Indiranagar',
   extensions.st_setsrid(extensions.st_makepoint(77.6412, 12.9719), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000202', '00000000-0000-4000-8000-000000000101', 'koramangala', 'Koramangala',
   extensions.st_setsrid(extensions.st_makepoint(77.6245, 12.9352), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000203', '00000000-0000-4000-8000-000000000101', 'hsr-layout', 'HSR Layout',
   extensions.st_setsrid(extensions.st_makepoint(77.6474, 12.9116), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000204', '00000000-0000-4000-8000-000000000101', 'whitefield', 'Whitefield',
   extensions.st_setsrid(extensions.st_makepoint(77.7500, 12.9698), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000205', '00000000-0000-4000-8000-000000000101', 'jayanagar', 'Jayanagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5838, 12.9308), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000206', '00000000-0000-4000-8000-000000000101', 'marathahalli', 'Marathahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.7011, 12.9569), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000207', '00000000-0000-4000-8000-000000000101', 'bellandur', 'Bellandur',
   extensions.st_setsrid(extensions.st_makepoint(77.6784, 12.9304), 4326)::extensions.geography),
  -- Central
  ('00000000-0000-4000-8000-000000000208', '00000000-0000-4000-8000-000000000101', 'mg-road', 'MG Road',
   extensions.st_setsrid(extensions.st_makepoint(77.6045, 12.9758), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000209', '00000000-0000-4000-8000-000000000101', 'brigade-road', 'Brigade Road',
   extensions.st_setsrid(extensions.st_makepoint(77.6083, 12.9716), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000210', '00000000-0000-4000-8000-000000000101', 'shivajinagar', 'Shivajinagar',
   extensions.st_setsrid(extensions.st_makepoint(77.6057, 12.9857), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000211', '00000000-0000-4000-8000-000000000101', 'richmond-town', 'Richmond Town',
   extensions.st_setsrid(extensions.st_makepoint(77.6041, 12.9634), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000212', '00000000-0000-4000-8000-000000000101', 'wilson-garden', 'Wilson Garden',
   extensions.st_setsrid(extensions.st_makepoint(77.5977, 12.9498), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000213', '00000000-0000-4000-8000-000000000101', 'shanthi-nagar', 'Shanthi Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.6014, 12.9583), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000214', '00000000-0000-4000-8000-000000000101', 'cox-town', 'Cox Town',
   extensions.st_setsrid(extensions.st_makepoint(77.6157, 12.9944), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000215', '00000000-0000-4000-8000-000000000101', 'frazer-town', 'Frazer Town',
   extensions.st_setsrid(extensions.st_makepoint(77.6103, 12.9958), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000216', '00000000-0000-4000-8000-000000000101', 'cooke-town', 'Cooke Town',
   extensions.st_setsrid(extensions.st_makepoint(77.6198, 12.9989), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000217', '00000000-0000-4000-8000-000000000101', 'benson-town', 'Benson Town',
   extensions.st_setsrid(extensions.st_makepoint(77.6117, 13), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000218', '00000000-0000-4000-8000-000000000101', 'jayamahal', 'Jayamahal',
   extensions.st_setsrid(extensions.st_makepoint(77.5975, 12.9973), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000219', '00000000-0000-4000-8000-000000000101', 'seshadripuram', 'Seshadripuram',
   extensions.st_setsrid(extensions.st_makepoint(77.5773, 12.9932), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000220', '00000000-0000-4000-8000-000000000101', 'chickpet', 'Chickpet',
   extensions.st_setsrid(extensions.st_makepoint(77.5764, 12.9679), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000221', '00000000-0000-4000-8000-000000000101', 'gandhi-nagar', 'Gandhi Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5745, 12.9765), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000222', '00000000-0000-4000-8000-000000000101', 'majestic', 'Majestic',
   extensions.st_setsrid(extensions.st_makepoint(77.5713, 12.9767), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000223', '00000000-0000-4000-8000-000000000101', 'ulsoor', 'Ulsoor',
   extensions.st_setsrid(extensions.st_makepoint(77.6224, 12.9815), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000224', '00000000-0000-4000-8000-000000000101', 'domlur', 'Domlur',
   extensions.st_setsrid(extensions.st_makepoint(77.6387, 12.9611), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000225', '00000000-0000-4000-8000-000000000101', 'vasanth-nagar', 'Vasanth Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5934, 12.9878), 4326)::extensions.geography),
  -- North
  ('00000000-0000-4000-8000-000000000226', '00000000-0000-4000-8000-000000000101', 'malleshwaram', 'Malleshwaram',
   extensions.st_setsrid(extensions.st_makepoint(77.5697, 13.0027), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000227', '00000000-0000-4000-8000-000000000101', 'rajajinagar', 'Rajajinagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5528, 12.9911), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000228', '00000000-0000-4000-8000-000000000101', 'vijayanagar', 'Vijayanagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5325, 12.9719), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000229', '00000000-0000-4000-8000-000000000101', 'basaveshwaranagar', 'Basaveshwaranagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5372, 12.9833), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000230', '00000000-0000-4000-8000-000000000101', 'yeshwanthpur', 'Yeshwanthpur',
   extensions.st_setsrid(extensions.st_makepoint(77.5541, 13.0284), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000231', '00000000-0000-4000-8000-000000000101', 'peenya', 'Peenya',
   extensions.st_setsrid(extensions.st_makepoint(77.517, 13.0281), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000232', '00000000-0000-4000-8000-000000000101', 'nagarbhavi', 'Nagarbhavi',
   extensions.st_setsrid(extensions.st_makepoint(77.5023, 12.9599), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000233', '00000000-0000-4000-8000-000000000101', 'rt-nagar', 'RT Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5949, 13.0198), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000234', '00000000-0000-4000-8000-000000000101', 'sadashivanagar', 'Sadashivanagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5806, 13.0067), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000235', '00000000-0000-4000-8000-000000000101', 'sanjaynagar', 'Sanjaynagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5773, 13.018), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000236', '00000000-0000-4000-8000-000000000101', 'hebbal', 'Hebbal',
   extensions.st_setsrid(extensions.st_makepoint(77.5971, 13.0355), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000237', '00000000-0000-4000-8000-000000000101', 'yelahanka', 'Yelahanka',
   extensions.st_setsrid(extensions.st_makepoint(77.5963, 13.1005), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000238', '00000000-0000-4000-8000-000000000101', 'jakkur', 'Jakkur',
   extensions.st_setsrid(extensions.st_makepoint(77.6081, 13.0784), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000239', '00000000-0000-4000-8000-000000000101', 'hbr-layout', 'HBR Layout',
   extensions.st_setsrid(extensions.st_makepoint(77.6274, 13.0287), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000240', '00000000-0000-4000-8000-000000000101', 'kammanahalli', 'Kammanahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.6367, 13.0176), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000241', '00000000-0000-4000-8000-000000000101', 'kalyan-nagar', 'Kalyan Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.6398, 13.0219), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000242', '00000000-0000-4000-8000-000000000101', 'banaswadi', 'Banaswadi',
   extensions.st_setsrid(extensions.st_makepoint(77.6501, 13.014), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000243', '00000000-0000-4000-8000-000000000101', 'horamavu', 'Horamavu',
   extensions.st_setsrid(extensions.st_makepoint(77.6478, 13.0303), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000244', '00000000-0000-4000-8000-000000000101', 'nagawara', 'Nagawara',
   extensions.st_setsrid(extensions.st_makepoint(77.6229, 13.0389), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000245', '00000000-0000-4000-8000-000000000101', 'vidyaranyapura', 'Vidyaranyapura',
   extensions.st_setsrid(extensions.st_makepoint(77.5586, 13.068), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000246', '00000000-0000-4000-8000-000000000101', 'mathikere', 'Mathikere',
   extensions.st_setsrid(extensions.st_makepoint(77.5679, 13.0342), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000247', '00000000-0000-4000-8000-000000000101', 'sahakara-nagar', 'Sahakara Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5807, 13.0596), 4326)::extensions.geography),
  -- East
  ('00000000-0000-4000-8000-000000000248', '00000000-0000-4000-8000-000000000101', 'cv-raman-nagar', 'CV Raman Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.6636, 12.9836), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000249', '00000000-0000-4000-8000-000000000101', 'kaggadasapura', 'Kaggadasapura',
   extensions.st_setsrid(extensions.st_makepoint(77.6667, 12.9887), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000250', '00000000-0000-4000-8000-000000000101', 'kr-puram', 'KR Puram',
   extensions.st_setsrid(extensions.st_makepoint(77.6961, 13.0059), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000251', '00000000-0000-4000-8000-000000000101', 'mahadevapura', 'Mahadevapura',
   extensions.st_setsrid(extensions.st_makepoint(77.697, 12.9902), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000252', '00000000-0000-4000-8000-000000000101', 'hoodi', 'Hoodi',
   extensions.st_setsrid(extensions.st_makepoint(77.7134, 12.9906), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000253', '00000000-0000-4000-8000-000000000101', 'brookefield', 'Brookefield',
   extensions.st_setsrid(extensions.st_makepoint(77.7157, 12.9634), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000254', '00000000-0000-4000-8000-000000000101', 'kundalahalli', 'Kundalahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.7147, 12.9646), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000255', '00000000-0000-4000-8000-000000000101', 'munnekollal', 'Munnekollal',
   extensions.st_setsrid(extensions.st_makepoint(77.7107, 12.9569), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000256', '00000000-0000-4000-8000-000000000101', 'varthur', 'Varthur',
   extensions.st_setsrid(extensions.st_makepoint(77.7407, 12.9412), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000257', '00000000-0000-4000-8000-000000000101', 'panathur', 'Panathur',
   extensions.st_setsrid(extensions.st_makepoint(77.6989, 12.937), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000258', '00000000-0000-4000-8000-000000000101', 'kadubeesanahalli', 'Kadubeesanahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.6968, 12.9339), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000259', '00000000-0000-4000-8000-000000000101', 'sarjapur-road', 'Sarjapur Road',
   extensions.st_setsrid(extensions.st_makepoint(77.6874, 12.9106), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000260', '00000000-0000-4000-8000-000000000101', 'old-airport-road', 'Old Airport Road',
   extensions.st_setsrid(extensions.st_makepoint(77.6613, 12.9581), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000261', '00000000-0000-4000-8000-000000000101', 'old-madras-road', 'Old Madras Road',
   extensions.st_setsrid(extensions.st_makepoint(77.674, 12.9963), 4326)::extensions.geography),
  -- South
  ('00000000-0000-4000-8000-000000000262', '00000000-0000-4000-8000-000000000101', 'btm-layout', 'BTM Layout',
   extensions.st_setsrid(extensions.st_makepoint(77.6101, 12.9166), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000263', '00000000-0000-4000-8000-000000000101', 'jp-nagar', 'JP Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5851, 12.9077), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000264', '00000000-0000-4000-8000-000000000101', 'banashankari', 'Banashankari',
   extensions.st_setsrid(extensions.st_makepoint(77.5665, 12.925), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000265', '00000000-0000-4000-8000-000000000101', 'basavanagudi', 'Basavanagudi',
   extensions.st_setsrid(extensions.st_makepoint(77.576, 12.9422), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000266', '00000000-0000-4000-8000-000000000101', 'uttarahalli', 'Uttarahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.5462, 12.9046), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000267', '00000000-0000-4000-8000-000000000101', 'jaraganahalli', 'Jaraganahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.5776, 12.8963), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000268', '00000000-0000-4000-8000-000000000101', 'kumaraswamy-layout', 'Kumaraswamy Layout',
   extensions.st_setsrid(extensions.st_makepoint(77.5588, 12.9058), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000269', '00000000-0000-4000-8000-000000000101', 'arekere', 'Arekere',
   extensions.st_setsrid(extensions.st_makepoint(77.5951, 12.8867), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000270', '00000000-0000-4000-8000-000000000101', 'hulimavu', 'Hulimavu',
   extensions.st_setsrid(extensions.st_makepoint(77.6023, 12.8836), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000271', '00000000-0000-4000-8000-000000000101', 'bannerghatta-road', 'Bannerghatta Road',
   extensions.st_setsrid(extensions.st_makepoint(77.5975, 12.8901), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000272', '00000000-0000-4000-8000-000000000101', 'electronic-city', 'Electronic City',
   extensions.st_setsrid(extensions.st_makepoint(77.6602, 12.8452), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000273', '00000000-0000-4000-8000-000000000101', 'begur', 'Begur',
   extensions.st_setsrid(extensions.st_makepoint(77.6259, 12.8802), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000274', '00000000-0000-4000-8000-000000000101', 'bommanahalli', 'Bommanahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.6222, 12.8994), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000275', '00000000-0000-4000-8000-000000000101', 'bommasandra', 'Bommasandra',
   extensions.st_setsrid(extensions.st_makepoint(77.6892, 12.8074), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000276', '00000000-0000-4000-8000-000000000101', 'kudlu', 'Kudlu',
   extensions.st_setsrid(extensions.st_makepoint(77.644, 12.8867), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000277', '00000000-0000-4000-8000-000000000101', 'hongasandra', 'Hongasandra',
   extensions.st_setsrid(extensions.st_makepoint(77.6321, 12.9006), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000278', '00000000-0000-4000-8000-000000000101', 'madivala', 'Madivala',
   extensions.st_setsrid(extensions.st_makepoint(77.6229, 12.9226), 4326)::extensions.geography),
  -- West
  ('00000000-0000-4000-8000-000000000279', '00000000-0000-4000-8000-000000000101', 'rajarajeshwari-nagar', 'Rajarajeshwari Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.517, 12.9268), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000280', '00000000-0000-4000-8000-000000000101', 'kengeri', 'Kengeri',
   extensions.st_setsrid(extensions.st_makepoint(77.4855, 12.9081), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000281', '00000000-0000-4000-8000-000000000101', 'kamakshipalya', 'Kamakshipalya',
   extensions.st_setsrid(extensions.st_makepoint(77.5335, 12.9887), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000282', '00000000-0000-4000-8000-000000000101', 'nayandahalli', 'Nayandahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.5271, 12.9412), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000283', '00000000-0000-4000-8000-000000000101', 'mysore-road', 'Mysore Road',
   extensions.st_setsrid(extensions.st_makepoint(77.532, 12.9494), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000284', '00000000-0000-4000-8000-000000000101', 'jnanabharathi', 'Jnanabharathi',
   extensions.st_setsrid(extensions.st_makepoint(77.5019, 12.9337), 4326)::extensions.geography),
  -- More real gaps in the original 84: dense residential pockets (Ejipura,
  -- Viveknagar, Austin Town, Murugeshpalya) that sat between covered areas
  -- with no centroid of their own, plus the outer corridors — airport road,
  -- Kanakapura Road, Attibele/Anekal on the Tamil Nadu border, the IT
  -- corridor past Whitefield — that Bangalore's actual footprint reaches but
  -- the original batch stopped short of. Same sourcing and precision class
  -- as the rest of this table (see the comment above): compiled from general
  -- geographic knowledge, not an API. A chef's own service_radius_km is what
  -- actually gates who's shown, so a centroid a few hundred metres off
  -- changes nothing about search correctness.
  ('00000000-0000-4000-8000-000000000285', '00000000-0000-4000-8000-000000000101', 'ejipura', 'Ejipura',
   extensions.st_setsrid(extensions.st_makepoint(77.6280, 12.9420), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000286', '00000000-0000-4000-8000-000000000101', 'viveknagar', 'Viveknagar',
   extensions.st_setsrid(extensions.st_makepoint(77.6180, 12.9430), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000287', '00000000-0000-4000-8000-000000000101', 'austin-town', 'Austin Town',
   extensions.st_setsrid(extensions.st_makepoint(77.6150, 12.9630), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000288', '00000000-0000-4000-8000-000000000101', 'murugeshpalya', 'Murugeshpalya',
   extensions.st_setsrid(extensions.st_makepoint(77.6613, 12.9560), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000289', '00000000-0000-4000-8000-000000000101', 'kodihalli', 'Kodihalli (HAL)',
   extensions.st_setsrid(extensions.st_makepoint(77.6480, 12.9600), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000290', '00000000-0000-4000-8000-000000000101', 'ramamurthy-nagar', 'Ramamurthy Nagar',
   extensions.st_setsrid(extensions.st_makepoint(77.6650, 13.0210), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000291', '00000000-0000-4000-8000-000000000101', 'hennur', 'Hennur',
   extensions.st_setsrid(extensions.st_makepoint(77.6390, 13.0350), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000292', '00000000-0000-4000-8000-000000000101', 'thanisandra', 'Thanisandra',
   extensions.st_setsrid(extensions.st_makepoint(77.6220, 13.0570), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000293', '00000000-0000-4000-8000-000000000101', 'kothanur', 'Kothanur',
   extensions.st_setsrid(extensions.st_makepoint(77.6480, 13.0430), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000294', '00000000-0000-4000-8000-000000000101', 'kadugodi', 'Kadugodi',
   extensions.st_setsrid(extensions.st_makepoint(77.7620, 12.9930), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000295', '00000000-0000-4000-8000-000000000101', 'itpl', 'ITPL / Hope Farm',
   extensions.st_setsrid(extensions.st_makepoint(77.7370, 12.9860), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000296', '00000000-0000-4000-8000-000000000101', 'yelahanka-new-town', 'Yelahanka New Town',
   extensions.st_setsrid(extensions.st_makepoint(77.5960, 13.1150), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000297', '00000000-0000-4000-8000-000000000101', 'dasarahalli', 'Dasarahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.5220, 13.0430), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000298', '00000000-0000-4000-8000-000000000101', 'jalahalli', 'Jalahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.5530, 13.0450), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000299', '00000000-0000-4000-8000-000000000101', 'girinagar', 'Girinagar',
   extensions.st_setsrid(extensions.st_makepoint(77.5570, 12.9390), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000300', '00000000-0000-4000-8000-000000000101', 'konanakunte', 'Konanakunte',
   extensions.st_setsrid(extensions.st_makepoint(77.5670, 12.8770), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000301', '00000000-0000-4000-8000-000000000101', 'talaghattapura', 'Talaghattapura',
   extensions.st_setsrid(extensions.st_makepoint(77.5470, 12.8580), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000302', '00000000-0000-4000-8000-000000000101', 'kanakapura-road', 'Kanakapura Road',
   extensions.st_setsrid(extensions.st_makepoint(77.5490, 12.8350), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000303', '00000000-0000-4000-8000-000000000101', 'chandra-layout', 'Chandra Layout',
   extensions.st_setsrid(extensions.st_makepoint(77.5390, 12.9640), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000304', '00000000-0000-4000-8000-000000000101', 'magadi-road', 'Magadi Road',
   extensions.st_setsrid(extensions.st_makepoint(77.5350, 12.9770), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000305', '00000000-0000-4000-8000-000000000101', 'sarjapur', 'Sarjapur',
   extensions.st_setsrid(extensions.st_makepoint(77.7360, 12.8600), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000306', '00000000-0000-4000-8000-000000000101', 'devanahalli', 'Devanahalli',
   extensions.st_setsrid(extensions.st_makepoint(77.7150, 13.2437), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000307', '00000000-0000-4000-8000-000000000101', 'attibele', 'Attibele',
   extensions.st_setsrid(extensions.st_makepoint(77.7770, 12.7830), 4326)::extensions.geography),
  ('00000000-0000-4000-8000-000000000308', '00000000-0000-4000-8000-000000000101', 'anekal', 'Anekal',
   extensions.st_setsrid(extensions.st_makepoint(77.6960, 12.7110), 4326)::extensions.geography)
on conflict (id) do nothing;

-- ---------- cuisines ----------
-- The original 15 leaned heavily on regional-Indian staples. The 14 appended
-- after them close gaps against what a buyer actually searches for on
-- Swiggy/Zomato-style cuisine filters (Punjabi, Chettinad, Momos, Sweets,
-- Continental, ...) that home kitchens genuinely cook but had nowhere to tag
-- themselves under — most were previously flattened into "North Indian" or
-- "Bakes & Desserts" (see ingest/src/normalise/taxonomy.ts, updated in the
-- same change). Fast food / pizza / burgers deliberately excluded — that's
-- restaurant fare, not ghar-ka-khana, and doesn't belong on a home-chef
-- directory (CONCEPT.md).
insert into public.cuisines (id, slug, name) values
  ('00000000-0000-4000-8000-000000000301', 'biryani', 'Biryani'),
  ('00000000-0000-4000-8000-000000000302', 'north-indian', 'North Indian'),
  ('00000000-0000-4000-8000-000000000303', 'south-indian', 'South Indian'),
  ('00000000-0000-4000-8000-000000000304', 'bengali', 'Bengali'),
  ('00000000-0000-4000-8000-000000000305', 'andhra', 'Andhra'),
  ('00000000-0000-4000-8000-000000000306', 'kerala', 'Kerala'),
  ('00000000-0000-4000-8000-000000000307', 'maharashtrian', 'Maharashtrian'),
  ('00000000-0000-4000-8000-000000000308', 'gujarati', 'Gujarati'),
  ('00000000-0000-4000-8000-000000000309', 'rajasthani', 'Rajasthani'),
  ('00000000-0000-4000-8000-000000000310', 'mangalorean', 'Mangalorean'),
  ('00000000-0000-4000-8000-000000000311', 'hyderabadi', 'Hyderabadi'),
  ('00000000-0000-4000-8000-000000000312', 'chinese-desi', 'Indo-Chinese'),
  ('00000000-0000-4000-8000-000000000313', 'bakes-desserts', 'Bakes & Desserts'),
  ('00000000-0000-4000-8000-000000000314', 'healthy-meals', 'Healthy Meals'),
  ('00000000-0000-4000-8000-000000000315', 'tiffin-thali', 'Tiffin & Thali'),
  ('00000000-0000-4000-8000-000000000316', 'punjabi', 'Punjabi'),
  ('00000000-0000-4000-8000-000000000317', 'awadhi-mughlai', 'Awadhi & Mughlai'),
  ('00000000-0000-4000-8000-000000000318', 'chettinad', 'Chettinad'),
  ('00000000-0000-4000-8000-000000000319', 'konkani', 'Konkani'),
  ('00000000-0000-4000-8000-000000000320', 'goan', 'Goan'),
  ('00000000-0000-4000-8000-000000000321', 'parsi', 'Parsi'),
  ('00000000-0000-4000-8000-000000000322', 'kashmiri', 'Kashmiri'),
  ('00000000-0000-4000-8000-000000000323', 'sindhi', 'Sindhi'),
  ('00000000-0000-4000-8000-000000000324', 'north-eastern', 'North-Eastern'),
  ('00000000-0000-4000-8000-000000000325', 'bihari-purvanchali', 'Bihari & Purvanchali'),
  ('00000000-0000-4000-8000-000000000326', 'continental', 'Continental & Italian'),
  ('00000000-0000-4000-8000-000000000327', 'momos-street-food', 'Momos & Street Food'),
  ('00000000-0000-4000-8000-000000000328', 'sweets-mithai', 'Sweets & Mithai'),
  ('00000000-0000-4000-8000-000000000329', 'pickles-podis', 'Pickles & Podis')
on conflict (id) do nothing;

-- ---------- dietary tags ----------
insert into public.dietary_tags (id, slug, name) values
  ('00000000-0000-4000-8000-000000000401', 'veg', 'Pure Veg'),
  ('00000000-0000-4000-8000-000000000402', 'non_veg', 'Non-Veg'),
  ('00000000-0000-4000-8000-000000000403', 'halal', 'Halal'),
  ('00000000-0000-4000-8000-000000000404', 'jhatka', 'Jhatka'),
  ('00000000-0000-4000-8000-000000000405', 'jain', 'Jain'),
  ('00000000-0000-4000-8000-000000000406', 'egg_free', 'Egg-Free'),
  ('00000000-0000-4000-8000-000000000407', 'healthy', 'Healthy')
on conflict (id) do nothing;

-- ---------- demo chefs ----------
-- Standard weekly timings used by most demo chefs.
-- (Shape per src/types/schemas.ts timingsSchema.)

insert into public.chefs
  (id, city_id, neighbourhood_id, slug, display_name, kitchen_name, bio,
   phone_e164, whatsapp_e164, location, service_radius_km, address_area,
   status, listing_source, fssai_number, dietary_profile, is_verified, verified_at, timings)
values
  -- 1. Approved, halal biryani, Indiranagar
  ('00000000-0000-4000-8000-000000000501',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201',
   'demo-aishas-biryani', 'Aisha Khan', 'Demo Kitchen — Aisha''s Biryani',
   'Slow-cooked Hyderabadi biryani in small daily batches. Family recipe, three generations old.',
   '+919900000001', '+919900000001',
   extensions.st_setsrid(extensions.st_makepoint(77.6390, 12.9745), 4326)::extensions.geography,
   5, 'Indiranagar 2nd Stage', 'approved', 'scraped', '11223344556677', 'non_veg', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "tue": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "wed": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "thu": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "fri": {"open": "11:00", "close": "22:00", "order_cutoff": "21:00"}, "sat": {"open": "11:00", "close": "22:00", "order_cutoff": "21:00"}, "sun": {"closed": true}}}'),

  -- 2. Approved, pure veg thali, Koramangala
  ('00000000-0000-4000-8000-000000000502',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202',
   'demo-shalinis-veg-thali', 'Shalini Rao', 'Demo Kitchen — Shalini''s Veg Thali',
   'Homely North Indian veg thalis and monthly tiffin plans. No onion-garlic option available.',
   '+919900000002', '+919900000002',
   extensions.st_setsrid(extensions.st_makepoint(77.6220, 12.9330), 4326)::extensions.geography,
   6, 'Koramangala 5th Block', 'approved', 'scraped', '11223344556678', 'veg_only', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "tue": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "wed": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "thu": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "fri": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "sat": {"open": "10:00", "close": "20:00", "order_cutoff": "18:00"}, "sun": {"closed": true}}}'),

  -- 3. Approved, Mangalorean, HSR Layout
  ('00000000-0000-4000-8000-000000000503',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000203',
   'demo-mangalas-kori-rotti', 'Mangala Shetty', 'Demo Kitchen — Mangala''s Kori Rotti',
   'Authentic Mangalorean home food — kori rotti, neer dosa, chicken sukka. Weekend specials.',
   '+919900000003', '+919900000003',
   extensions.st_setsrid(extensions.st_makepoint(77.6500, 12.9140), 4326)::extensions.geography,
   6, 'HSR Sector 2', 'approved', 'scraped', '11223344556679', 'mixed', true, now(),
   '{"vacation": false, "days": {"mon": {"closed": true}, "tue": {"open": "11:00", "close": "21:00", "order_cutoff": "19:00"}, "wed": {"open": "11:00", "close": "21:00", "order_cutoff": "19:00"}, "thu": {"open": "11:00", "close": "21:00", "order_cutoff": "19:00"}, "fri": {"open": "11:00", "close": "21:00", "order_cutoff": "19:00"}, "sat": {"open": "09:00", "close": "21:00", "order_cutoff": "19:00"}, "sun": {"open": "09:00", "close": "15:00", "order_cutoff": "13:00"}}}'),

  -- 4. Approved, halal Hyderabadi, Whitefield
  ('00000000-0000-4000-8000-000000000504',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000204',
   'demo-fatimas-daawat', 'Fatima Begum', 'Demo Kitchen — Fatima''s Daawat',
   'Hyderabadi haleem, marag, and dum biryani. Bulk trays for small gatherings on 24h notice.',
   '+919900000004', '+919900000004',
   extensions.st_setsrid(extensions.st_makepoint(77.7470, 12.9660), 4326)::extensions.geography,
   7, 'Whitefield, Palm Meadows side', 'approved', 'scraped', '11223344556680', 'non_veg', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}, "tue": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}, "wed": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}, "thu": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}, "fri": {"open": "12:00", "close": "22:00", "order_cutoff": "21:00"}, "sat": {"open": "12:00", "close": "22:00", "order_cutoff": "21:00"}, "sun": {"open": "12:00", "close": "21:00", "order_cutoff": "20:00"}}}'),

  -- 5. Approved, Jain, Jayanagar
  ('00000000-0000-4000-8000-000000000505',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000205',
   'demo-meeras-jain-rasoi', 'Meera Jain', 'Demo Kitchen — Meera''s Jain Rasoi',
   'Strict Jain kitchen — no onion, no garlic, no root vegetables. Tiffins and festival specials.',
   '+919900000005', '+919900000005',
   extensions.st_setsrid(extensions.st_makepoint(77.5850, 12.9280), 4326)::extensions.geography,
   4, 'Jayanagar 4th Block', 'approved', 'scraped', '11223344556681', 'veg_only', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "tue": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "wed": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "thu": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "fri": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "sat": {"open": "09:00", "close": "19:00", "order_cutoff": "17:00"}, "sun": {"closed": true}}}'),

  -- 6. Approved, healthy meals with nutrition data, Marathahalli
  ('00000000-0000-4000-8000-000000000506',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000206',
   'demo-ruchis-healthy-bowls', 'Ruchi Verma', 'Demo Kitchen — Ruchi''s Healthy Bowls',
   'Macro-counted meal bowls for fitness folks. Weekly subscriptions via WhatsApp.',
   '+919900000006', '+919900000006',
   extensions.st_setsrid(extensions.st_makepoint(77.6980, 12.9540), 4326)::extensions.geography,
  10, 'Marathahalli Bridge area', 'approved', 'self_signup', '11223344556682', 'mixed', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "tue": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "wed": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "thu": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "fri": {"open": "07:00", "close": "20:00", "order_cutoff": "18:00"}, "sat": {"closed": true}, "sun": {"closed": true}}}'),

  -- 7. Approved, Bengali, Bellandur
  ('00000000-0000-4000-8000-000000000507',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000207',
   'demo-bengali-ghor-ranna', 'Sutapa Ghosh', 'Demo Kitchen — Ghor Ranna',
   'Bengali home cooking — kosha mangsho, shorshe ilish (seasonal), luchi-alur dom on Sundays.',
   '+919900000007', '+919900000007',
   extensions.st_setsrid(extensions.st_makepoint(77.6750, 12.9330), 4326)::extensions.geography,
   8, 'Bellandur, Green Glen Layout', 'approved', 'scraped', '11223344556683', 'mixed', true, now(),
   '{"vacation": false, "days": {"mon": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "tue": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "wed": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "thu": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "fri": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "sat": {"open": "11:00", "close": "21:00", "order_cutoff": "19:30"}, "sun": {"open": "09:00", "close": "15:00", "order_cutoff": "13:00"}}}'),

  -- 8. Pending review (must NOT appear publicly) — used to test the queue + 404
  ('00000000-0000-4000-8000-000000000508',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000201',
   'demo-punjabi-tadka', 'Gurpreet Kaur', 'Demo Kitchen — Punjabi Tadka',
   'Punjabi home food — sarson da saag in winter, rajma-chawal always. Jhatka meat only.',
   '+919900000008', '+919900000008',
   extensions.st_setsrid(extensions.st_makepoint(77.6440, 12.9700), 4326)::extensions.geography,
   5, 'Indiranagar 1st Stage', 'pending_review', 'scraped', '11223344556684', 'mixed', false, null,
   '{"vacation": false, "days": {"mon": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "tue": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "wed": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "thu": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "fri": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "sat": {"open": "11:00", "close": "21:00", "order_cutoff": "20:00"}, "sun": {"closed": true}}}'),

  -- 9. Draft (incomplete scraped listing awaiting normalisation/promotion detail)
  ('00000000-0000-4000-8000-000000000509',
   '00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000202',
   'demo-andhra-ruchulu', 'Padma Reddy', 'Demo Kitchen — Andhra Ruchulu',
   'Fiery Andhra meals — gongura pachadi, chicken fry, ragi sangati.',
   '+919900000009', '+919900000009',
   extensions.st_setsrid(extensions.st_makepoint(77.6270, 12.9380), 4326)::extensions.geography,
   3, 'Koramangala 6th Block', 'draft', 'scraped', null, 'mixed', false, null, null)
on conflict (id) do nothing;

-- ---------- chef ↔ cuisine ----------
insert into public.chef_cuisines (chef_id, cuisine_id) values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000301'),
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000311'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000302'),
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000315'),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000310'),
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000303'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000311'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000301'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000302'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000315'),
  ('00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000314'),
  ('00000000-0000-4000-8000-000000000507', '00000000-0000-4000-8000-000000000304'),
  ('00000000-0000-4000-8000-000000000508', '00000000-0000-4000-8000-000000000302'),
  ('00000000-0000-4000-8000-000000000509', '00000000-0000-4000-8000-000000000305')
on conflict do nothing;

-- ---------- chef ↔ dietary tags ----------
insert into public.chef_dietary_tags (chef_id, tag_id) values
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000403'), -- halal
  ('00000000-0000-4000-8000-000000000501', '00000000-0000-4000-8000-000000000402'), -- non_veg
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000401'), -- veg
  ('00000000-0000-4000-8000-000000000502', '00000000-0000-4000-8000-000000000406'), -- egg_free
  ('00000000-0000-4000-8000-000000000503', '00000000-0000-4000-8000-000000000402'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000403'),
  ('00000000-0000-4000-8000-000000000504', '00000000-0000-4000-8000-000000000402'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000401'),
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000405'), -- jain
  ('00000000-0000-4000-8000-000000000505', '00000000-0000-4000-8000-000000000406'),
  ('00000000-0000-4000-8000-000000000506', '00000000-0000-4000-8000-000000000407'), -- healthy
  ('00000000-0000-4000-8000-000000000507', '00000000-0000-4000-8000-000000000402'),
  ('00000000-0000-4000-8000-000000000508', '00000000-0000-4000-8000-000000000404'), -- jhatka
  ('00000000-0000-4000-8000-000000000508', '00000000-0000-4000-8000-000000000402')
on conflict do nothing;

-- ---------- menu items ----------
-- Menu rows have generated ids, so re-runs replace demo menus instead of duplicating.
delete from public.menu_items
 where chef_id in (select id from public.chefs where id::text like '00000000-0000-4000-8000-0000000005%');

insert into public.menu_items
  (chef_id, name, description, price, currency_code, unit, is_best_seller, dietary, nutrition, sort_order)
values
  ('00000000-0000-4000-8000-000000000501', 'Chicken Dum Biryani', 'With mirchi ka salan and raita.', 280, 'INR', 'per plate', true,  'non_veg', null, 1),
  ('00000000-0000-4000-8000-000000000501', 'Mutton Biryani', 'Weekend special, order by Friday 8 PM.', 380, 'INR', 'per plate', true,  'non_veg', null, 2),
  ('00000000-0000-4000-8000-000000000501', 'Veg Biryani', null, 200, 'INR', 'per plate', false, 'veg', null, 3),
  ('00000000-0000-4000-8000-000000000502', 'Full Veg Thali', 'Dal, sabzi, 4 rotis, rice, salad, sweet.', 150, 'INR', 'per thali', true, 'veg', null, 1),
  ('00000000-0000-4000-8000-000000000502', 'Monthly Lunch Tiffin', '26 days, delivered by noon.', 3200, 'INR', 'per month', false, 'veg', null, 2),
  ('00000000-0000-4000-8000-000000000503', 'Kori Rotti', 'Bunt-style chicken curry with crisp rotti.', 260, 'INR', 'per plate', true, 'non_veg', null, 1),
  ('00000000-0000-4000-8000-000000000503', 'Neer Dosa (8 pc) + Chutney', null, 120, 'INR', 'per plate', false, 'veg', null, 2),
  ('00000000-0000-4000-8000-000000000504', 'Hyderabadi Haleem', 'Ramzan-style, available year-round on weekends.', 220, 'INR', 'per bowl', true, 'non_veg', null, 1),
  ('00000000-0000-4000-8000-000000000504', 'Mutton Dum Biryani (Family Pack)', 'Serves 4.', 1400, 'INR', 'per pack', false, 'non_veg', null, 2),
  ('00000000-0000-4000-8000-000000000505', 'Jain Thali', 'No onion, no garlic, no root veg.', 160, 'INR', 'per thali', true, 'veg', null, 1),
  ('00000000-0000-4000-8000-000000000505', 'Jain Pav Bhaji', 'Made with raw banana.', 130, 'INR', 'per plate', false, 'veg', null, 2),
  ('00000000-0000-4000-8000-000000000506', 'High-Protein Chicken Bowl', 'Grilled chicken, quinoa, greens.', 240, 'INR', 'per bowl', true, 'non_veg',
   '{"calories_kcal": 520, "protein_g": 42, "carbs_g": 45, "fat_g": 16, "serving_g": 380}', 1),
  ('00000000-0000-4000-8000-000000000506', 'Paneer Power Bowl', 'Tandoori paneer, brown rice, salad.', 220, 'INR', 'per bowl', false, 'veg',
   '{"calories_kcal": 480, "protein_g": 28, "carbs_g": 52, "fat_g": 18, "serving_g": 360}', 2),
  ('00000000-0000-4000-8000-000000000507', 'Kosha Mangsho + Basanti Pulao', 'Sunday special.', 320, 'INR', 'per plate', true, 'non_veg', null, 1),
  ('00000000-0000-4000-8000-000000000507', 'Bhetki Paturi', 'Seasonal availability.', 280, 'INR', 'per piece', false, 'non_veg', null, 2),
  ('00000000-0000-4000-8000-000000000508', 'Rajma Chawal', null, 140, 'INR', 'per plate', false, 'veg', null, 1)
on conflict do nothing;
