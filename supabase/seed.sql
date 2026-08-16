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
insert into public.cities (id, country_id, slug, name, center, timezone, is_active) values
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001',
   'bangalore', 'Bangalore',
   extensions.st_setsrid(extensions.st_makepoint(77.5946, 12.9716), 4326)::extensions.geography,
   'Asia/Kolkata', true)
on conflict (id) do nothing;

-- ---------- neighbourhoods (real centroids) ----------
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
   extensions.st_setsrid(extensions.st_makepoint(77.6784, 12.9304), 4326)::extensions.geography)
on conflict (id) do nothing;

-- ---------- cuisines ----------
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
  ('00000000-0000-4000-8000-000000000315', 'tiffin-thali', 'Tiffin & Thali')
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
