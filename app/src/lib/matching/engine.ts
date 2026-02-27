// ── Matchmaking engine — orchestrates data fetching + scoring ──

import { createAdminClient } from '@/lib/supabase/admin';
import type {
  PositionMatchData,
  PositionChildData,
  NannyMatchData,
  NannyProfileData,
  NannyCredentialData,
  PostcodeData,
  MatchResult,
  MatchingResult,
} from './types';
import { normalizeNannySchedule, haversineDistance, ageFromDob } from './normalize';
import {
  calculateQualityBase,
  calculateRequirementMultiplier,
  calculateOverQualifiedMultiplier,
  calculateFinalScore,
} from './scoring';
import { QUAL_SCORES } from './constants';

export async function runMatchmaking(positionId: string): Promise<MatchingResult> {
  const supabase = createAdminClient();

  // ── Step 1: Fetch position data (3 parallel queries) ──
  const [positionRes, childrenRes, scheduleRes] = await Promise.all([
    supabase
      .from('nanny_positions')
      .select('id, parent_id, drivers_license_required, car_required, vaccination_required, non_smoker_required, comfortable_with_pets_required, minimum_age_requirement, years_of_experience, language_preference, language_preference_details, reason_for_nanny, schedule_type, urgency, suburb, postcode, details')
      .eq('id', positionId)
      .single(),
    supabase
      .from('position_children')
      .select('age_months')
      .eq('position_id', positionId),
    supabase
      .from('position_schedule')
      .select('schedule')
      .eq('position_id', positionId)
      .maybeSingle(),
  ]);

  if (positionRes.error || !positionRes.data) {
    console.error('Position fetch error:', positionRes.error);
    return { matches: [], totalEligible: 0 };
  }

  const position = positionRes.data as PositionMatchData;
  const children: PositionChildData[] = (childrenRes.data ?? []).map((c) => ({
    age_months: c.age_months,
  }));
  const positionSchedule = (scheduleRes.data?.schedule as Record<string, string[]>) ?? null;

  // ── Step 2: Fetch all visible nannies (single query for nannies, then batch related) ──
  const { data: nannies, error: nannyError } = await supabase
    .from('nannies')
    .select('id, user_id, total_experience_years, nanny_experience_years, under_3_experience_years, newborn_experience_years, max_children, min_child_age_months, max_child_age_months, additional_needs_ok, drivers_license, has_car, vaccination_status, non_smoker, comfortable_with_pets, hourly_rate_min, languages, role_types_preferred, level_of_support_offered, immediate_start_available, ai_content')
    .gte('verification_level', 3);

  if (nannyError || !nannies || nannies.length === 0) {
    if (nannyError) console.error('Nanny fetch error:', nannyError);
    return { matches: [], totalEligible: 0 };
  }

  const totalEligible = nannies.length;
  const nannyIds = nannies.map((n) => n.id);
  const userIds = nannies.map((n) => n.user_id);

  // Batch fetch related data
  const [profilesRes, availabilityRes, credentialsRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('user_id, first_name, last_name, suburb, postcode, date_of_birth, profile_picture_url')
      .in('user_id', userIds),
    supabase
      .from('nanny_availability')
      .select('nanny_id, days_available, schedule')
      .in('nanny_id', nannyIds),
    supabase
      .from('nanny_credentials')
      .select('nanny_id, credential_category, qualification_type, certification_type')
      .in('nanny_id', nannyIds),
  ]);

  // Build lookup maps
  const profileMap = new Map<string, NannyProfileData>();
  for (const p of profilesRes.data ?? []) {
    profileMap.set(p.user_id, p as NannyProfileData);
  }

  const availabilityMap = new Map<string, Record<string, string[]>>();
  for (const a of availabilityRes.data ?? []) {
    availabilityMap.set(
      a.nanny_id,
      normalizeNannySchedule(a.schedule as Record<string, unknown>)
    );
  }

  const credentialMap = new Map<string, NannyCredentialData[]>();
  for (const c of credentialsRes.data ?? []) {
    const existing = credentialMap.get(c.nanny_id) ?? [];
    existing.push(c as NannyCredentialData);
    credentialMap.set(c.nanny_id, existing);
  }

  // ── Step 3: Fetch postcodes for distance calc ──
  const allSuburbs = new Set<string>();
  if (position.suburb) allSuburbs.add(position.suburb);
  for (const p of profilesRes.data ?? []) {
    if (p.suburb) allSuburbs.add(p.suburb);
  }

  const postcodeMap = new Map<string, PostcodeData>();
  if (allSuburbs.size > 0) {
    const { data: postcodes } = await supabase
      .from('sydney_postcodes')
      .select('suburb, latitude, longitude')
      .in('suburb', Array.from(allSuburbs));

    for (const pc of postcodes ?? []) {
      postcodeMap.set(pc.suburb.toLowerCase(), {
        suburb: pc.suburb,
        latitude: Number(pc.latitude),
        longitude: Number(pc.longitude),
      });
    }
  }

  // Parent's coordinates
  const parentPostcode = position.suburb
    ? postcodeMap.get(position.suburb.toLowerCase())
    : null;

  // ── Step 4: Score each nanny ──
  const results: MatchResult[] = [];

  for (const nanny of nannies as NannyMatchData[]) {
    const profile = profileMap.get(nanny.user_id);
    if (!profile) continue; // skip nannies without profile

    const nannySchedule = availabilityMap.get(nanny.id) ?? {};
    const nannyCredentials = credentialMap.get(nanny.id) ?? [];

    // Distance
    let distanceKm: number | null = null;
    if (parentPostcode && profile.suburb) {
      const nannyPostcode = postcodeMap.get(profile.suburb.toLowerCase());
      if (nannyPostcode) {
        distanceKm = haversineDistance(
          parentPostcode.latitude,
          parentPostcode.longitude,
          nannyPostcode.latitude,
          nannyPostcode.longitude
        );
        distanceKm = Math.round(distanceKm * 10) / 10; // 1 decimal
      }
    }

    // Nanny age
    const nannyAge = ageFromDob(profile.date_of_birth);

    // Layer 1: Quality Base
    const { score: qualityBase, breakdown, scheduleOverlapPercent } =
      calculateQualityBase(
        position,
        children,
        nanny,
        nannyCredentials,
        distanceKm,
        nannySchedule,
        positionSchedule
      );

    // Layer 2: Requirement Multiplier
    const { multiplier: reqMultiplier, unmetRequirements } =
      calculateRequirementMultiplier(position, children, nanny, nannyAge);

    // Layer 3: Over-qualified Multiplier
    const { multiplier: oqMultiplier, bonuses: oqBonuses } =
      calculateOverQualifiedMultiplier(position, nanny, nannyCredentials, nannyAge);

    // Final score
    const { rawScore, finalScore } = calculateFinalScore(
      qualityBase,
      reqMultiplier,
      oqMultiplier
    );

    // Highest qualification for display
    let highestQualification: string | null = null;
    let highestQualScore = 0;
    for (const cred of nannyCredentials) {
      if (cred.credential_category === 'qualification' && cred.qualification_type) {
        const qs = QUAL_SCORES[cred.qualification_type] ?? 0;
        if (qs > highestQualScore) {
          highestQualScore = qs;
          highestQualification = cred.qualification_type;
        }
      }
    }

    // Specific certification names for display
    const rawCerts = nannyCredentials
      .filter((c) => c.credential_category === 'certification' && c.certification_type)
      .map((c) => c.certification_type!);
    // "First Aid in Childcare Setting" → "Child First Aid" and takes priority over plain "First Aid"
    const hasChildFirstAid = rawCerts.some((c) =>
      c.toLowerCase().includes('childcare') || c.toLowerCase().includes('child first aid')
    );
    const certifications = rawCerts
      .map((c) => {
        if (c.toLowerCase().includes('childcare')) return 'Child First Aid';
        return c;
      })
      .filter((c) => !(hasChildFirstAid && c === 'First Aid'));

    results.push({
      nannyId: nanny.id,
      nanny,
      profile,
      qualityBase,
      requirementMultiplier: reqMultiplier,
      overQualifiedMultiplier: oqMultiplier,
      rawScore,
      finalScore,
      breakdown,
      distanceKm,
      scheduleOverlapPercent,
      highestQualification,
      certifications,
      nannySchedule: nannySchedule,
      unmetRequirements,
      overQualifiedBonuses: oqBonuses,
    });
  }

  // Sort by final score descending
  results.sort((a, b) => b.finalScore - a.finalScore);

  return { matches: results, totalEligible };
}
