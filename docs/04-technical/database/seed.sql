-- ============================================================================
-- BABY BLOOM SYDNEY - SEED DATA
-- ============================================================================
-- This file seeds the database with:
-- 1. Sydney postcode reference data (194 suburbs)
-- 2. Test users for development (3 nannies, 2 parents, 1 admin)
-- 3. Sample nanny profiles with varying verification tiers
-- 4. Sample parent profiles with positions
-- 5. Sample matching data (interview request)
--
-- IMPORTANT: Test user UUIDs are placeholders. After creating auth users
-- in Supabase, update the UUID variables in the DO block below.
--
-- Run AFTER supabase-setup.sql has created all tables.
-- ============================================================================

-- ============================================================================
-- SECTION 1: SYDNEY POSTCODES (194 suburbs)
-- ============================================================================
-- Source: MM - postcodes.csv
-- All 194 Sydney suburbs with latitude/longitude for geolocation matching
-- ============================================================================

insert into sydney_postcodes (suburb, postcode, latitude, longitude) values
('Sydney', '2000', -33.8688, 151.2093),
('Ultimo', '2007', -33.8822, 151.1987),
('Chippendale', '2008', -33.8872, 151.2007),
('Pyrmont', '2009', -33.8733, 151.1963),
('Surry Hills', '2010', -33.8861, 151.2111),
('Potts Point', '2011', -33.8708, 151.2263),
('Alexandria', '2015', -33.9080, 151.1905),
('Redfern', '2016', -33.8929, 151.2053),
('Waterloo', '2017', -33.9001, 151.2115),
('Rosebery', '2018', -33.9213, 151.2045),
('Botany', '2019', -33.9392, 151.2069),
('Mascot', '2020', -33.9312, 151.1894),
('Paddington', '2021', -33.8837, 151.2296),
('Bondi Junction', '2022', -33.8915, 151.2466),
('Bellevue Hill', '2023', -33.8821, 151.2514),
('Waverley', '2024', -33.9014, 151.2541),
('Woollahra', '2025', -33.8885, 151.2394),
('Bondi', '2026', -33.8910, 151.2646),
('Edgecliff', '2027', -33.8794, 151.2356),
('Double Bay', '2028', -33.8770, 151.2415),
('Rose Bay', '2029', -33.8761, 151.2574),
('Vaucluse', '2030', -33.8566, 151.2721),
('Randwick', '2031', -33.9144, 151.2415),
('Kingsford', '2032', -33.9238, 151.2312),
('Kensington', '2033', -33.9097, 151.2227),
('Coogee', '2034', -33.9192, 151.2536),
('Maroubra', '2035', -33.9458, 151.2403),
('Little Bay', '2036', -33.9782, 151.2443),
('Glebe', '2037', -33.8778, 151.1852),
('Annandale', '2038', -33.8817, 151.1714),
('Rozelle', '2039', -33.8647, 151.1738),
('Leichhardt', '2040', -33.8845, 151.1561),
('Balmain', '2041', -33.8583, 151.1788),
('Newtown', '2042', -33.8970, 151.1793),
('Erskineville', '2043', -33.9005, 151.1853),
('St Peters', '2044', -33.9090, 151.1820),
('Haberfield', '2045', -33.8803, 151.1396),
('Five Dock', '2046', -33.8648, 151.1293),
('Drummoyne', '2047', -33.8530, 151.1555),
('Stanmore', '2048', -33.8933, 151.1648),
('Petersham', '2049', -33.8953, 151.1561),
('Camperdown', '2050', -33.8883, 151.1751),
('North Sydney', '2060', -33.8358, 151.2069),
('Kirribilli', '2061', -33.8491, 151.2166),
('Cammeray', '2062', -33.8242, 151.2127),
('Northbridge', '2063', -33.8122, 151.2155),
('Artarmon', '2064', -33.8087, 151.1852),
('Crows Nest', '2065', -33.8256, 151.2014),
('Lane Cove', '2066', -33.8157, 151.1728),
('Chatswood', '2067', -33.7961, 151.1780),
('Willoughby', '2068', -33.8078, 151.2015),
('Roseville', '2069', -33.7850, 151.1785),
('Lindfield', '2070', -33.7744, 151.1687),
('Killara', '2071', -33.7667, 151.1627),
('Gordon', '2072', -33.7562, 151.1534),
('Pymble', '2073', -33.7438, 151.1422),
('Turramurra', '2074', -33.7319, 151.1306),
('St Ives', '2075', -33.7275, 151.1725),
('Wahroonga', '2076', -33.7196, 151.1182),
('Hornsby', '2077', -33.7033, 151.0978),
('Mount Colah', '2079', -33.6933, 151.1122),
('Mount Kuring-Gai', '2080', -33.6822, 151.1211),
('Berowra', '2081', -33.6667, 151.1333),
('Cowan', '2082', -33.6500, 151.1500),
('Brooklyn', '2083', -33.6167, 151.1500),
('Cottage Point', '2084', -33.6000, 151.2333),
('Belrose', '2085', -33.7333, 151.2167),
('Frenchs Forest', '2086', -33.7500, 151.2167),
('Forestville', '2087', -33.7667, 151.2167),
('Mosman', '2088', -33.8290, 151.2427),
('Neutral Bay', '2089', -33.8329, 151.2227),
('Cremorne', '2090', -33.8293, 151.2289),
('Seaforth', '2092', -33.8048, 151.2435),
('Balgowlah', '2093', -33.7964, 151.2612),
('Fairlight', '2094', -33.7972, 151.2721),
('Manly', '2095', -33.7963, 151.2878),
('Freshwater', '2096', -33.7801, 151.2863),
('Collaroy', '2097', -33.7333, 151.3000),
('Dee Why', '2099', -33.7507, 151.2954),
('Brookvale', '2100', -33.7656, 151.2707),
('Narrabeen', '2101', -33.7193, 151.2959),
('Warriewood', '2102', -33.6922, 151.3044),
('Mona Vale', '2103', -33.6749, 151.3060),
('Bayview', '2104', -33.6500, 151.3167),
('Church Point', '2105', -33.6333, 151.3167),
('Newport', '2106', -33.6333, 151.3000),
('Avalon', '2107', -33.6333, 151.3333),
('Palm Beach', '2108', -33.5986, 151.3204),
('Hunters Hill', '2110', -33.8333, 151.1500),
('Gladesville', '2111', -33.8167, 151.1333),
('Ryde', '2112', -33.8153, 151.1011),
('North Ryde', '2113', -33.7925, 151.1333),
('West Ryde', '2114', -33.8050, 151.0850),
('Meadowbank', '2115', -33.8050, 151.0700),
('Rydalmere', '2116', -33.8000, 151.0667),
('Dundas', '2117', -33.7833, 151.0667),
('Carlingford', '2118', -33.7833, 151.0500),
('Beecroft', '2119', -33.7667, 151.0500),
('Pennant Hills', '2120', -33.7500, 151.0667),
('Epping', '2121', -33.7744, 151.0822),
('Eastwood', '2122', -33.7833, 151.1000),
('West Pennant Hills', '2125', -33.7833, 151.0333),
('Cherrybrook', '2126', -33.7333, 151.0333),
('Newington', '2127', -33.8427, 151.0664),
('Silverwater', '2128', -33.8422, 151.0475),
('Summer Hill', '2130', -33.8893, 151.1378),
('Ashfield', '2131', -33.8889, 151.1256),
('Croydon', '2132', -33.8833, 151.1167),
('Croydon Park', '2133', -33.8833, 151.1000),
('Burwood', '2134', -33.8774, 151.1038),
('Strathfield', '2135', -33.8797, 151.0827),
('Enfield', '2136', -33.8750, 151.0750),
('Concord', '2137', -33.8542, 151.1031),
('Rhodes', '2138', -33.8297, 151.0872),
('Homebush', '2140', -33.8667, 151.0833),
('Lidcombe', '2141', -33.8642, 151.0428),
('Granville', '2142', -33.8333, 151.0167),
('Regents Park', '2143', -33.8833, 151.0000),
('Auburn', '2144', -33.8497, 151.0336),
('Wentworthville', '2145', -33.8167, 150.9333),
('Toongabbie', '2146', -33.7833, 150.9500),
('Seven Hills', '2147', -33.7833, 150.9333),
('Blacktown', '2148', -33.7710, 150.9063),
('Parramatta', '2150', -33.8150, 151.0011),
('North Rocks', '2151', -33.7800, 151.0183),
('Northmead', '2152', -33.7833, 151.0000),
('Baulkham Hills', '2153', -33.7578, 150.9906),
('Castle Hill', '2154', -33.7297, 151.0069),
('Kellyville', '2155', -33.7126, 150.9507),
('Annangrove', '2156', -33.6833, 150.9500),
('Glenorie', '2157', -33.6500, 151.0333),
('Dural', '2158', -33.6667, 151.0000),
('Galston', '2159', -33.6333, 151.0333),
('Merrylands', '2160', -33.8500, 150.9333),
('Guildford', '2161', -33.8500, 150.9167),
('Chester Hill', '2162', -33.8667, 150.9667),
('Villawood', '2163', -33.8833, 150.9667),
('Smithfield', '2164', -33.8667, 150.9167),
('Fairfield', '2165', -33.8667, 150.8833),
('Canley Vale', '2166', -33.8833, 150.9167),
('Green Valley', '2168', -33.9167, 150.8833),
('Liverpool', '2170', -33.9167, 150.9167),
('Hoxton Park', '2171', -33.9333, 150.8500),
('Bossley Park', '2176', -33.8667, 150.8500),
('Greenacre', '2190', -33.9167, 151.0667),
('Belfield', '2191', -33.8967, 151.0967),
('Belmore', '2192', -33.8920, 151.1160),
('Canterbury', '2193', -33.9100, 151.1140),
('Campsie', '2194', -33.9125, 151.1278),
('Lakemba', '2195', -33.9214, 151.0822),
('Punchbowl', '2196', -33.9358, 151.0736),
('Bass Hill', '2197', -33.9200, 151.0900),
('Georges Hall', '2198', -33.9200, 151.0500),
('Yagoona', '2199', -33.9300, 151.0300),
('Bankstown', '2200', -33.9167, 151.0333),
('Dulwich Hill', '2203', -33.9103, 151.1408),
('Marrickville', '2204', -33.9111, 151.1573),
('Wolli Creek', '2205', -33.9312, 151.1565),
('Earlwood', '2206', -33.9229, 151.1293),
('Bexley', '2207', -33.9482, 151.1260),
('Kingsgrove', '2208', -33.9372, 151.1062),
('Beverly Hills', '2209', -33.9515, 151.0825),
('Peakhurst', '2210', -33.9500, 151.0667),
('Padstow', '2211', -33.9500, 151.0167),
('Revesby', '2212', -33.9667, 151.0167),
('Panania', '2213', -33.9667, 150.9833),
('Milperra', '2214', -33.9667, 150.9667),
('Rockdale', '2216', -33.9517, 151.1388),
('Kogarah', '2217', -33.9650, 151.1350),
('Carlton', '2218', -33.9667, 151.1167),
('Sans Souci', '2219', -33.9833, 151.1333),
('Hurstville', '2220', -33.9678, 151.1036),
('Carss Park', '2221', -33.9833, 151.1000),
('Penshurst', '2222', -33.9833, 151.0833),
('Oatley', '2223', -33.9833, 151.0667),
('Sylvania', '2224', -34.0000, 151.0667),
('Oyster Bay', '2225', -34.0167, 151.0667),
('Jannali', '2226', -34.0167, 151.0500),
('Gymea', '2227', -34.0333, 151.0500),
('Miranda', '2228', -34.0361, 151.1028),
('Caringbah', '2229', -34.0333, 151.1167),
('Cronulla', '2230', -34.0574, 151.1522),
('Kurnell', '2231', -34.0167, 151.1500),
('Sutherland', '2232', -34.0315, 151.0583),
('Engadine', '2233', -34.0500, 151.0000),
('Menai', '2234', -34.0000, 151.0167),
('Campbelltown', '2560', -34.0667, 150.8167),
('Camden', '2570', -34.0500, 150.7000),
('Glenmore Park', '2745', -33.7333, 150.6833),
('Kingswood', '2747', -33.7667, 150.7167),
('Penrith', '2750', -33.7507, 150.6877),
('St Marys', '2760', -33.7667, 150.7833),
('Quakers Hill', '2763', -33.7333, 150.8333),
('Glenwood', '2768', -33.7167, 150.9167);

-- ============================================================================
-- TEST USERS
-- ============================================================================
-- In development, create test users via Supabase Dashboard or Auth API:
--
-- Test Nanny 1: sarah.nanny@test.com / password123
-- Test Nanny 2: emma.nanny@test.com / password123
-- Test Nanny 3: olivia.nanny@test.com / password123
-- Test Parent 1: james.parent@test.com / password123
-- Test Parent 2: sophie.parent@test.com / password123
-- Test Admin: admin@babybloomsydney.com.au / [secure password]
--
-- After creating auth users, use the UUIDs below as placeholders.
-- Replace with actual UUIDs from your Supabase auth.users table.
-- ============================================================================

-- ============================================================================
-- SECTIONS 2-12: TEST DATA (all inside a single DO block)
-- ============================================================================

do $$
declare
  -- Placeholder UUIDs - replace with actual auth.users IDs after creating test accounts
  v_nanny1_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_nanny2_user_id uuid := '00000000-0000-0000-0000-000000000002';
  v_nanny3_user_id uuid := '00000000-0000-0000-0000-000000000003';
  v_parent1_user_id uuid := '00000000-0000-0000-0000-000000000004';
  v_parent2_user_id uuid := '00000000-0000-0000-0000-000000000005';
  v_admin_user_id uuid := '00000000-0000-0000-0000-000000000006';

  -- Generated entity IDs
  v_nanny1_id uuid := gen_random_uuid();
  v_nanny2_id uuid := gen_random_uuid();
  v_nanny3_id uuid := gen_random_uuid();
  v_parent1_id uuid := gen_random_uuid();
  v_parent2_id uuid := gen_random_uuid();
  v_position1_id uuid := gen_random_uuid();

begin

  -- ==========================================================================
  -- SECTION 3: USER ROLES
  -- ==========================================================================
  -- 3 nannies, 2 parents, 1 admin
  -- ==========================================================================

  insert into user_roles (user_id, role) values
  (v_nanny1_user_id, 'nanny'),
  (v_nanny2_user_id, 'nanny'),
  (v_nanny3_user_id, 'nanny'),
  (v_parent1_user_id, 'parent'),
  (v_parent2_user_id, 'parent'),
  (v_admin_user_id, 'admin');

  -- ==========================================================================
  -- SECTION 4: USER PROFILES
  -- ==========================================================================
  -- Realistic profiles for all 6 test users with Sydney suburbs
  -- ==========================================================================

  insert into user_profiles (user_id, first_name, last_name, email, mobile_number, date_of_birth, suburb, postcode, state) values
  (v_nanny1_user_id, 'Sarah', 'Johnson', 'sarah.nanny@test.com', '0412345001', '1996-03-15', 'Bondi', '2026', 'NSW'),
  (v_nanny2_user_id, 'Emma', 'Williams', 'emma.nanny@test.com', '0412345002', '1998-07-22', 'Manly', '2095', 'NSW'),
  (v_nanny3_user_id, 'Olivia', 'Brown', 'olivia.nanny@test.com', '0412345003', '2001-11-08', 'Surry Hills', '2010', 'NSW'),
  (v_parent1_user_id, 'James', 'Smith', 'james.parent@test.com', '0412345004', '1988-05-20', 'Paddington', '2021', 'NSW'),
  (v_parent2_user_id, 'Sophie', 'Davis', 'sophie.parent@test.com', '0412345005', '1990-09-10', 'Mosman', '2088', 'NSW'),
  (v_admin_user_id, 'Admin', 'User', 'admin@babybloomsydney.com.au', '0412345006', '1985-01-01', 'Sydney', '2000', 'NSW');

  -- ==========================================================================
  -- SECTION 5: NANNY PROFILES (3 test nannies)
  -- ==========================================================================

  -- Sarah Johnson - Tier 3, fully verified, experienced
  insert into nannies (
    id, user_id,
    gender, nationality, languages,
    total_experience_years, nanny_experience_years, under_3_experience_years, newborn_experience_years,
    experience_details,
    role_types_preferred, level_of_support_offered,
    hourly_rate_min, pay_frequency, immediate_start_available, placement_ongoing_preferred,
    max_children, min_child_age_months, max_child_age_months, additional_needs_ok,
    sydney_resident, residency_status, right_to_work,
    drivers_license, has_car, comfortable_with_pets, vaccination_status, non_smoker,
    hobbies_interests, strengths_traits, skills_training,
    status, verification_tier,
    wwcc_verified, wwcc_expiry_date, identity_verified,
    tier2_achieved_at, tier3_achieved_at
  ) values (
    v_nanny1_id, v_nanny1_user_id,
    'female', 'Australian', array['English', 'French'],
    6, 4, 3, 2,
    'Experienced nanny with a background in early childhood education. Have worked with families across the Eastern Suburbs including newborns, toddlers, and school-age children. Comfortable managing multiple children and creating structured daily routines.',
    array['Nanny', 'Babysitter'], array['Full Support', 'Shared Care'],
    35.00, array['Weekly'], true, true,
    3, 0, 144, false,
    true, 'Australian Citizen', true,
    true, true, true, true, true,
    'Yoga, surfing, reading children''s literature, arts and crafts',
    'Patient, creative, organised, warm and nurturing',
    'Montessori-trained, baby sign language, water safety certified',
    'active', 'tier3',
    true, '2027-06-30', true,
    now() - interval '6 months', now() - interval '3 months'
  );

  -- Emma Williams - Tier 2, verified, mid-experience
  insert into nannies (
    id, user_id,
    gender, nationality, languages,
    total_experience_years, nanny_experience_years, under_3_experience_years, newborn_experience_years,
    experience_details,
    role_types_preferred, level_of_support_offered,
    hourly_rate_min, pay_frequency, immediate_start_available, placement_ongoing_preferred,
    max_children, min_child_age_months, max_child_age_months, additional_needs_ok,
    sydney_resident, residency_status, right_to_work,
    drivers_license, has_car, comfortable_with_pets, vaccination_status, non_smoker,
    hobbies_interests, strengths_traits, skills_training,
    status, verification_tier,
    wwcc_verified, wwcc_expiry_date, identity_verified,
    tier2_achieved_at
  ) values (
    v_nanny2_id, v_nanny2_user_id,
    'female', 'British', array['English'],
    3, 2, 1, 0,
    'Relocated from London where I worked as a nanny for two families. Experienced with toddlers and pre-school age children. Passionate about outdoor play and creative learning activities.',
    array['Nanny'], array['Full Support'],
    30.00, array['Weekly'], false, true,
    2, 12, 72, false,
    true, 'Permanent Resident', true,
    true, false, true, true, true,
    'Swimming, cooking, photography, bushwalking',
    'Energetic, reliable, great communicator, fun-loving',
    'Sensory play specialist, children''s nutrition course',
    'active', 'tier2',
    true, '2027-09-15', true,
    now() - interval '2 months'
  );

  -- Olivia Brown - Tier 1, new, pending verification
  insert into nannies (
    id, user_id,
    gender, nationality, languages,
    total_experience_years, nanny_experience_years,
    experience_details,
    role_types_preferred, level_of_support_offered,
    hourly_rate_min, pay_frequency, immediate_start_available,
    max_children, min_child_age_months, max_child_age_months,
    sydney_resident, residency_status, right_to_work,
    drivers_license, has_car, comfortable_with_pets, vaccination_status, non_smoker,
    hobbies_interests, strengths_traits, skills_training,
    status, verification_tier,
    wwcc_verified, identity_verified
  ) values (
    v_nanny3_id, v_nanny3_user_id,
    'female', 'Australian', array['English', 'Mandarin'],
    1, null,
    'Currently studying early childhood education. Have been babysitting for family friends since high school. Looking to gain more professional nanny experience.',
    array['Babysitter'], array['Shared Care'],
    28.00, array['Weekly'], true,
    2, 6, 96,
    true, 'Australian Citizen', true,
    false, false, true, true, true,
    'Drawing, playing piano, learning languages, board games',
    'Bilingual, patient, attentive, good with shy children',
    'Currently studying Certificate III in Early Childhood Education and Care',
    'pending_verification', 'tier1',
    false, false
  );

  -- ==========================================================================
  -- SECTION 6: NANNY AVAILABILITY (for Sarah and Emma)
  -- ==========================================================================

  -- Sarah: Available Mon-Fri 8am-6pm
  insert into nanny_availability (nanny_id, days_available, schedule) values
  (v_nanny1_id, array['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], '{
    "monday": {"available": true, "start": "08:00", "end": "18:00"},
    "tuesday": {"available": true, "start": "08:00", "end": "18:00"},
    "wednesday": {"available": true, "start": "08:00", "end": "18:00"},
    "thursday": {"available": true, "start": "08:00", "end": "18:00"},
    "friday": {"available": true, "start": "08:00", "end": "18:00"},
    "saturday": {"available": false, "start": null, "end": null},
    "sunday": {"available": false, "start": null, "end": null}
  }'::jsonb);

  -- Emma: Available Mon, Wed, Fri 9am-5pm
  insert into nanny_availability (nanny_id, days_available, schedule) values
  (v_nanny2_id, array['Monday', 'Wednesday', 'Friday'], '{
    "monday": {"available": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"available": false, "start": null, "end": null},
    "wednesday": {"available": true, "start": "09:00", "end": "17:00"},
    "thursday": {"available": false, "start": null, "end": null},
    "friday": {"available": true, "start": "09:00", "end": "17:00"},
    "saturday": {"available": false, "start": null, "end": null},
    "sunday": {"available": false, "start": null, "end": null}
  }'::jsonb);

  -- ==========================================================================
  -- SECTION 7: NANNY CREDENTIALS
  -- ==========================================================================

  -- Sarah: Diploma of Early Childhood Education
  insert into nanny_credentials (
    nanny_id, credential_category, qualification_type,
    institution, year_obtained,
    verified, verified_at, verified_by
  ) values (
    v_nanny1_id, 'qualification', 'Diploma of Early Childhood Education and Care',
    'TAFE NSW', 2020,
    true, now() - interval '5 months', v_admin_user_id
  );

  -- Sarah: CPR certification
  insert into nanny_credentials (
    nanny_id, credential_category, certification_type,
    issue_date, expiry_date,
    verified, verified_at, verified_by
  ) values (
    v_nanny1_id, 'certification', 'CPR',
    '2025-06-01', '2026-06-01',
    true, now() - interval '5 months', v_admin_user_id
  );

  -- Sarah: First Aid certification
  insert into nanny_credentials (
    nanny_id, credential_category, certification_type,
    issue_date, expiry_date,
    verified, verified_at, verified_by
  ) values (
    v_nanny1_id, 'certification', 'First Aid',
    '2025-06-01', '2028-06-01',
    true, now() - interval '5 months', v_admin_user_id
  );

  -- Emma: Certificate III
  insert into nanny_credentials (
    nanny_id, credential_category, qualification_type,
    institution, year_obtained,
    verified, verified_at, verified_by
  ) values (
    v_nanny2_id, 'qualification', 'Certificate III in Early Childhood Education and Care',
    'Norland College UK', 2022,
    true, now() - interval '2 months', v_admin_user_id
  );

  -- Emma: CPR certification
  insert into nanny_credentials (
    nanny_id, credential_category, certification_type,
    issue_date, expiry_date,
    verified, verified_at, verified_by
  ) values (
    v_nanny2_id, 'certification', 'CPR',
    '2025-08-15', '2026-08-15',
    true, now() - interval '2 months', v_admin_user_id
  );

  -- ==========================================================================
  -- SECTION 8: VERIFICATIONS (WWCC + Identity)
  -- ==========================================================================

  -- Sarah: fully_verified (WWCC + identity both verified)
  insert into verifications (
    user_id,
    wwcc_verification_method, wwcc_number, wwcc_declaration,
    wwcc_verified, wwcc_verified_at, wwcc_verified_by, wwcc_expiry_date,
    surname, given_names, date_of_birth, passport_country, passport_declaration,
    identity_verified, identity_verified_at, identity_verified_by, passport_expiry_date,
    verification_status
  ) values (
    v_nanny1_user_id,
    'manual_entry', 'WWC1234567E', true,
    true, now() - interval '6 months', v_admin_user_id, '2027-06-30',
    'Johnson', 'Sarah Elizabeth', '1996-03-15', 'Australia', true,
    true, now() - interval '6 months', v_admin_user_id, '2031-03-15',
    'fully_verified'
  );

  -- Emma: fully_verified (WWCC + identity both verified)
  insert into verifications (
    user_id,
    wwcc_verification_method, wwcc_number, wwcc_declaration,
    wwcc_verified, wwcc_verified_at, wwcc_verified_by, wwcc_expiry_date,
    surname, given_names, date_of_birth, passport_country, passport_declaration,
    identity_verified, identity_verified_at, identity_verified_by, passport_expiry_date,
    verification_status
  ) values (
    v_nanny2_user_id,
    'manual_entry', 'WWC7654321E', true,
    true, now() - interval '2 months', v_admin_user_id, '2027-09-15',
    'Williams', 'Emma Rose', '1998-07-22', 'United Kingdom', true,
    true, now() - interval '2 months', v_admin_user_id, '2030-07-22',
    'fully_verified'
  );

  -- Olivia: pending (nothing verified yet)
  insert into verifications (
    user_id,
    verification_status
  ) values (
    v_nanny3_user_id,
    'pending'
  );

  -- ==========================================================================
  -- SECTION 9: PARENT PROFILES (2 test parents)
  -- ==========================================================================

  -- James Smith: 2 children, active
  insert into parents (
    id, user_id,
    number_of_children, child_needs, about_family,
    status
  ) values (
    v_parent1_id, v_parent1_user_id,
    2, false, 'Active family in Paddington looking for regular childcare support. Both parents work full-time and need a reliable nanny Monday through Friday. Our children love outdoor activities, reading, and arts and crafts.',
    'active'
  );

  -- Sophie Davis: 1 child, active
  insert into parents (
    id, user_id,
    number_of_children, child_needs, about_family,
    status
  ) values (
    v_parent2_id, v_parent2_user_id,
    1, false, 'Working professional in Mosman seeking part-time nanny. Single mum looking for a warm and reliable carer for my toddler while I work three days a week. We have a friendly dog.',
    'active'
  );

  -- ==========================================================================
  -- SECTION 10: NANNY POSITION (for James)
  -- ==========================================================================

  insert into nanny_positions (
    id, parent_id,
    title, description,
    urgency, placement_length,
    schedule_type, hours_per_week, days_required, schedule_details,
    language_preference, minimum_age_requirement, years_of_experience,
    qualification_requirement, certificate_requirements, assurances_required,
    residency_status_requirement,
    vaccination_required, drivers_license_required, car_required,
    comfortable_with_pets_required, non_smoker_required,
    hourly_rate, pay_frequency,
    reason_for_nanny, level_of_support,
    status
  ) values (
    v_position1_id, v_parent1_id,
    'Nanny Position', 'Looking for an experienced, caring nanny to look after our two young children full-time during the work week. Must be comfortable with toddlers and able to manage two children at once. Ideally someone with first aid training and a genuine love for children.',
    'Immediately', 'Ongoing',
    'Yes', 40, array['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 'Monday to Friday, 8am to 4pm. Some flexibility possible on start/end times.',
    'English', 21, 2,
    'Diploma of Early Childhood Education and Care', array['CPR', 'First Aid'], array['National Police Check'],
    'Permanent Resident',
    true, true, false,
    false, true,
    35.00, array['Weekly'],
    array['Both parents work full-time'], array['Full Support'],
    'active'
  );

  -- Position schedule (JSONB)
  insert into position_schedule (position_id, schedule) values
  (v_position1_id, '{
    "monday": {"required": true, "start": "08:00", "end": "16:00"},
    "tuesday": {"required": true, "start": "08:00", "end": "16:00"},
    "wednesday": {"required": true, "start": "08:00", "end": "16:00"},
    "thursday": {"required": true, "start": "08:00", "end": "16:00"},
    "friday": {"required": true, "start": "08:00", "end": "16:00"},
    "saturday": {"required": false, "start": null, "end": null},
    "sunday": {"required": false, "start": null, "end": null}
  }'::jsonb);

  -- Position children (2 children - ages 18 months and 36 months)
  insert into position_children (position_id, child_label, age_months, gender, display_order) values
  (v_position1_id, 'A', 18, 'Male', 1),
  (v_position1_id, 'B', 36, 'Female', 2);

  -- ==========================================================================
  -- SECTION 11: NANNY AI CONTENT (for Sarah)
  -- ==========================================================================

  -- Bio summary
  insert into nanny_ai_content (
    nanny_id, content_type, content, ai_model, prompt_used,
    is_active, approved, approved_at, approved_by
  ) values (
    v_nanny1_id, 'bio_summary',
    'Sarah is a warm and experienced nanny based in Bondi with over six years of childcare experience. Holding a Diploma of Early Childhood Education, she brings a blend of professional knowledge and genuine care to every family she works with. Fluent in both English and French, Sarah is Montessori-trained and passionate about creating nurturing, structured environments where children can thrive. When she''s not working, you''ll find her surfing at Bondi Beach or exploring new arts and crafts projects to bring to her next session.',
    'claude-3-opus', 'Generate a warm, professional bio summary for a nanny profile based on their registration details.',
    true, true, now() - interval '3 months', v_admin_user_id
  );

  -- Headline
  insert into nanny_ai_content (
    nanny_id, content_type, content, ai_model, prompt_used,
    is_active, approved, approved_at, approved_by
  ) values (
    v_nanny1_id, 'headline',
    'Experienced & Qualified Nanny | Bondi | Montessori-Trained | Available Now',
    'claude-3-opus', 'Generate a concise profile headline for a nanny based on their key attributes.',
    true, true, now() - interval '3 months', v_admin_user_id
  );

  -- ==========================================================================
  -- SECTION 12: SAMPLE INTERVIEW REQUEST
  -- ==========================================================================
  -- From James (parent) to Sarah (nanny) for the position
  -- ==========================================================================

  insert into interview_requests (
    nanny_id, parent_id, position_id,
    message, requested_dates,
    status
  ) values (
    v_nanny1_id, v_parent1_id, v_position1_id,
    'Hi Sarah, we love your profile and think you would be a great fit for our family. We have two young children and are looking for a full-time nanny starting as soon as possible. Would you be available for an interview this week?',
    '[
      {"date": "2026-02-09", "time": "10:00", "type": "in_person", "location": "Our home in Paddington"},
      {"date": "2026-02-10", "time": "14:00", "type": "video_call", "location": "Zoom"},
      {"date": "2026-02-11", "time": "11:00", "type": "in_person", "location": "Cafe near Bondi Junction"}
    ]'::jsonb,
    'pending'
  );

end $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify seed data was inserted correctly
-- ============================================================================

select 'sydney_postcodes' as table_name, count(*) as row_count from sydney_postcodes
union all
select 'user_roles', count(*) from user_roles
union all
select 'user_profiles', count(*) from user_profiles
union all
select 'nannies', count(*) from nannies
union all
select 'nanny_availability', count(*) from nanny_availability
union all
select 'nanny_credentials', count(*) from nanny_credentials
union all
select 'verifications', count(*) from verifications
union all
select 'parents', count(*) from parents
union all
select 'nanny_positions', count(*) from nanny_positions
union all
select 'position_schedule', count(*) from position_schedule
union all
select 'position_children', count(*) from position_children
union all
select 'nanny_ai_content', count(*) from nanny_ai_content
union all
select 'interview_requests', count(*) from interview_requests
order by table_name;

-- ============================================================================
-- EXPECTED COUNTS
-- ============================================================================
-- sydney_postcodes:    194
-- user_roles:            6
-- user_profiles:         6
-- nannies:               3
-- nanny_availability:    2
-- nanny_credentials:     5
-- verifications:         3
-- parents:               2
-- nanny_positions:       1
-- position_schedule:     1
-- position_children:     2
-- nanny_ai_content:      2
-- interview_requests:    1
-- ============================================================================
