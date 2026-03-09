'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getParentId, getPosition } from './parent';
import { runMatchmaking, runBasicMatchmaking } from '@/lib/matching/engine';
import { normalizeNannySchedule } from '@/lib/matching/normalize';
import { DFY_TIERS, type DfyTier } from '@/lib/matching/constants';
import { createInboxMessage, getNannyPhone, getParentPhone, logConnectionEvent } from './connection-helpers';
import { sendEmail, sendBatchEmails } from '@/lib/email/resend';
import { getUserEmailInfo } from '@/lib/email/helpers';
import { sydneyToUTC, BRACKET_KEYS, TIME_BRACKETS, formatSydneyDate } from '@/lib/timezone';
import type { BracketKey } from '@/lib/timezone';
import { CONNECTION_STAGE, POSITION_STAGE, POSITION_STATUS } from '@/lib/position/constants';
import { funnelLog } from '@/lib/position/logger';
import type { MatchResult } from '@/lib/matching/types';

// ── Email styles (shared) ──

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app-babybloom.vercel.app';
const BASE_STYLE = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;`;
const BTN_STYLE = `background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;`;

// ── Types ──

export interface MatchesResponse {
  data: {
    matches: MatchResult[];
    stats: {
      totalEligible: number;
      returned: number;
    };
  } | null;
  error: string | null;
}

export interface DfyApplicant {
  notificationId: string;
  nannyId: string;
  matchScore: number;
  distanceKm: number | null;
  selectedTimeSlot: string;
  respondedAt: string;
  breakdown: {
    experience: number;
    schedule: number;
    location: number;
  } | null;
  nanny: {
    firstName: string;
    lastName: string;
    suburb: string | null;
    profilePicUrl: string | null;
    hourlyRateMin: number | null;
    experienceYears: number | null;
    aiHeadline: string | null;
    dateOfBirth: string | null;
    wwccVerified: boolean;
    schedule: Record<string, string[]> | null;
  };
}

export interface DfyNotification {
  id: string;
  positionId: string;
  matchScore: number;
  distanceKm: number | null;
  status: string;
  notifiedAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
  selectedTimeSlot: string | null;
  position: {
    suburb: string | null;
    scheduleType: string | null;
    hourlyRate: number | null;
    hoursPerWeek: number | null;
    daysRequired: string[] | null;
    levelOfSupport: string[] | null;
    urgency: string | null;
    startDate: string | null;
    placementLength: string | null;
    reasonForNanny: string[] | null;
    languagePreference: string | null;
    qualificationRequirement: string | null;
    certificateRequirements: string[] | null;
    vaccinationRequired: boolean | null;
    driversLicenseRequired: boolean | null;
    carRequired: boolean | null;
    comfortableWithPetsRequired: boolean | null;
    nonSmokerRequired: boolean | null;
    otherRequirements: string | null;
    description: string | null;
    children: Array<{ ageMonths: number; gender: string | null }>;
  };
  parent: {
    firstName: string;
    lastName: string;
    profilePicUrl: string | null;
  };
  availableTimeSlots: string[];
}

// ── Helper: get nanny ID for current user ──

async function getNannyId(): Promise<{ nannyId: string; userId: string } | null> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const adminClient = createAdminClient();
  const { data: nanny, error } = await adminClient
    .from('nannies')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (error || !nanny) return null;
  return { nannyId: nanny.id, userId: user.id };
}

// ── Helper: convert time slot to confirmed_time ──

function slotToConfirmedTime(slot: string): string {
  // ISO format: already a UTC string
  if (slot.includes('T')) return slot;
  // Legacy bracket format: "YYYY-MM-DD_bracket"
  const [date, bracket] = slot.split('_');
  const bracketDef = TIME_BRACKETS[bracket as BracketKey];
  if (!bracketDef) throw new Error(`Invalid bracket: ${bracket}`);
  return sydneyToUTC(date, bracketDef.startHour, 0);
}

// ── Helper: format time slot for display ──

function formatSlotForDisplay(slot: string): string {
  // ISO format: use formatSydneyDate
  if (slot.includes('T')) return formatSydneyDate(slot);
  // Legacy bracket format
  const [date, bracket] = slot.split('_');
  const bracketDef = TIME_BRACKETS[bracket as BracketKey];
  if (!bracketDef) return slot;
  const d = new Date(date + 'T00:00:00');
  const dayName = d.toLocaleDateString('en-AU', { weekday: 'short', timeZone: 'Australia/Sydney' });
  const dateStr = d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short', timeZone: 'Australia/Sydney' });
  return `${dayName} ${dateStr} — ${bracketDef.label} (${bracketDef.sublabel})`;
}

// ════════════════════════════════════════════════════════════════════════════
// 1. GET MATCHES FOR POSITION (existing)
// ════════════════════════════════════════════════════════════════════════════

export async function getMatchesForPosition(): Promise<MatchesResponse> {
  const parentId = await getParentId();
  if (!parentId) {
    return { data: null, error: 'Not authenticated as parent' };
  }

  // Get active position
  const { data: position, error: positionError } = await getPosition();
  if (positionError || !position) {
    return { data: null, error: positionError || 'No active position found' };
  }

  // Run matching
  const { matches, totalEligible } = await runMatchmaking(position.id);

  return {
    data: {
      matches,
      stats: {
        totalEligible,
        returned: matches.length,
      },
    },
    error: null,
  };
}

// ── Helper: build DFY email items for a batch of matches ──

interface DfyEmailPosition {
  id: string;
  children: Array<{ age_months: number }>;
  days_required?: string[] | null;
  hours_per_week?: number | null;
  hourly_rate?: number | null;
  schedule_type?: string | null;
  qualification_requirement?: string | null;
  certificate_requirements?: string[] | null;
  drivers_license_required?: boolean | null;
  car_required?: boolean | null;
  vaccination_required?: boolean | null;
  non_smoker_required?: boolean | null;
  comfortable_with_pets_required?: boolean | null;
  language_preference?: string | null;
  urgency?: string | null;
  start_date?: string | null;
  placement_length?: string | null;
  level_of_support?: string[] | null;
  description?: string | null;
}

interface DfyEmailContext {
  parentName: string;
  parentSuburb: string;
  position: DfyEmailPosition | null;
}

async function buildDfyEmailItems(
  matches: MatchResult[],
  context: DfyEmailContext,
): Promise<Array<{
  to: string;
  subject: string;
  html: string;
  emailType: string;
  recipientUserId: string;
}>> {
  const adminClient = createAdminClient();
  const { parentName, parentSuburb, position } = context;

  if (!position) return [];

  // Build children display
  const childrenDisplay = position.children
    .map((c: { age_months: number }) => {
      if (c.age_months < 12) return `${c.age_months}mo`;
      const years = Math.floor(c.age_months / 12);
      return `${years}yr`;
    })
    .join(', ');

  // Build comprehensive position details for email
  const daysDisplay = position.days_required?.join(', ') || '';
  const hoursDisplay = position.hours_per_week ? `${position.hours_per_week}h/week` : '';
  const rateDisplay = position.hourly_rate ? `$${position.hourly_rate}/hr` : 'Rate negotiable';
  const scheduleDisplay = position.schedule_type || 'Flexible';

  // Get nanny email info for batch emails
  const nannyUserIds = matches.map(m => m.nanny.user_id);
  const { data: nannyProfiles } = await adminClient
    .from('user_profiles')
    .select('user_id, email, first_name')
    .in('user_id', nannyUserIds);

  const profileMap = new Map(
    (nannyProfiles ?? []).map(p => [p.user_id, p])
  );

  return matches
    .map(m => {
      const profile = profileMap.get(m.nanny.user_id);
      if (!profile) return null;
      return {
        to: profile.email,
        subject: `A family in ${parentSuburb} matched with you!`,
        html: `<div style="${BASE_STYLE}">
          <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${profile.first_name},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">${parentName} from ${parentSuburb} is looking for a nanny and you're one of their top matches!</p>
          <div style="background: #F5F3FF; border: 1px solid #C4B5FD; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 12px; font-weight: 600; color: #5B21B6;">Position Details</p>
            <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
              <tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Children</td><td style="padding: 4px 0;">${position.children.length} ${position.children.length === 1 ? 'child' : 'children'} (${childrenDisplay})</td></tr>
              <tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Schedule</td><td style="padding: 4px 0;">${scheduleDisplay}</td></tr>
              <tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Rate</td><td style="padding: 4px 0;">${rateDisplay}</td></tr>
              ${hoursDisplay ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Hours</td><td style="padding: 4px 0;">${hoursDisplay}</td></tr>` : ''}
              ${daysDisplay ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Days</td><td style="padding: 4px 0;">${daysDisplay}</td></tr>` : ''}
              ${parentSuburb ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Location</td><td style="padding: 4px 0;">${parentSuburb}</td></tr>` : ''}
              ${position.urgency ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Start</td><td style="padding: 4px 0;">${position.urgency}${position.start_date ? ` — ${position.start_date}` : ''}</td></tr>` : ''}
              ${position.placement_length ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Duration</td><td style="padding: 4px 0;">${position.placement_length}</td></tr>` : ''}
              ${position.level_of_support?.length ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Support</td><td style="padding: 4px 0;">${position.level_of_support.join(', ')}</td></tr>` : ''}
            </table>
            ${position.description ? `<p style="margin: 8px 0 0; font-size: 13px; color: #374151;">${position.description}</p>` : ''}
          </div>
          <p style="color: #374151; font-size: 14px;">View the full position details and let the family know you're interested.</p>
          <p style="margin-top: 24px;"><a href="${APP_URL}/nanny/positions" style="${BTN_STYLE}">View Position & Respond</a></p>
        </div>`,
        emailType: 'dfy_nanny_notification',
        recipientUserId: m.nanny.user_id,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);
}

// ── Helper: send DFY notifications (emails + inbox messages) for a batch of matches ──

async function sendDfyNotifications(
  matches: MatchResult[],
  context: DfyEmailContext,
): Promise<{ sent: number; failed: number }> {
  const { parentName, parentSuburb, position } = context;
  if (!position) return { sent: 0, failed: 0 };

  // Build and send emails
  const emailItems = await buildDfyEmailItems(matches, context);
  const result = await sendBatchEmails(emailItems);

  if (result.failed > 0) {
    console.error(`[DFY] Email: ${result.sent} sent, ${result.failed} failed out of ${emailItems.length}`);
  }

  // Create inbox messages
  await Promise.allSettled(
    matches.map(m =>
      createInboxMessage({
        userId: m.nanny.user_id,
        type: 'dfy_match',
        title: `A family in ${parentSuburb} matched with you!`,
        body: `${parentName} is looking for a nanny and you're one of their top matches. View the position and respond.`,
        actionUrl: '/nanny/positions',
        referenceId: position.id,
        referenceType: 'dfy_match_notification',
      })
    )
  );

  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// 2. TRIGGER DFY MATCHMAKING (Parent) — Wave 1 + pre-create wave 2/3
// ════════════════════════════════════════════════════════════════════════════

export async function triggerDfyMatchmaking(
  timeSlots: string[]
): Promise<{ success: boolean; error: string | null; notifiedCount?: number }> {
  const adminClient = createAdminClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  // Get active position
  const { data: position, error: positionError } = await getPosition();
  if (positionError || !position) {
    return { success: false, error: positionError || 'No active position found' };
  }

  // Check DFY status — allow re-trigger only after expiry
  const { data: positionData } = await adminClient
    .from('nanny_positions')
    .select('dfy_activated_at, dfy_expires_at')
    .eq('id', position.id)
    .single();

  if (positionData?.dfy_activated_at) {
    if (positionData.dfy_expires_at && new Date(positionData.dfy_expires_at) > new Date()) {
      const expiryDate = formatSydneyDate(positionData.dfy_expires_at);
      return { success: false, error: `Your search is still active until ${expiryDate}. You can boost again after it expires.` };
    }
    // Expired — run lazy cleanup before re-triggering
    await expireDfyNotifications(position.id, parentId);
  }

  // Validate time slots (ISO UTC strings)
  if (!timeSlots || timeSlots.length < 3) {
    return { success: false, error: 'Please select at least 3 preferred time slots.' };
  }

  for (const slot of timeSlots) {
    const d = new Date(slot);
    if (isNaN(d.getTime())) {
      return { success: false, error: 'Invalid time slot format.' };
    }
  }

  // Run matching algorithm
  const { matches } = await runMatchmaking(position.id);

  // Exclude nannies with existing active connections
  const { data: existingConnections } = await adminClient
    .from('connection_requests')
    .select('nanny_id')
    .eq('position_id', position.id)
    .in('status', ['pending', 'accepted', 'confirmed']);

  // Also exclude ALL previously notified nannies (from any DFY round)
  const { data: previouslyNotified } = await adminClient
    .from('dfy_match_notifications')
    .select('nanny_id')
    .eq('position_id', position.id);

  const excludedNannyIds = new Set([
    ...(existingConnections ?? []).map(c => c.nanny_id),
    ...(previouslyNotified ?? []).map(n => n.nanny_id),
  ]);

  // Take top 60 matches (3 waves of 20), excluding nannies with existing connections
  const topMatches = matches
    .filter(m => !excludedNannyIds.has(m.nannyId))
    .slice(0, 60);

  if (topMatches.length === 0) {
    return { success: false, error: 'No eligible nannies found to notify.' };
  }

  // Split into 3 waves of 20
  const wave1 = topMatches.slice(0, 20);
  const wave2 = topMatches.slice(20, 40);
  const wave3 = topMatches.slice(40, 60);

  const now = new Date().toISOString();

  // Build notification rows for ALL waves
  const allNotificationRows = [
    ...wave1.map(m => ({
      position_id: position.id,
      nanny_id: m.nannyId,
      match_score: m.rawScore,
      distance_km: m.distanceKm,
      notification_method: 'email',
      notified_at: now,
      status: 'notified',
      wave: 1,
      metadata: {
        breakdown: m.breakdown ?? null,
        headline: m.nanny.ai_content?.headline ?? null,
      },
    })),
    ...wave2.map(m => ({
      position_id: position.id,
      nanny_id: m.nannyId,
      match_score: m.rawScore,
      distance_km: m.distanceKm,
      notification_method: 'email',
      notified_at: null,
      status: 'pending_wave',
      wave: 2,
      metadata: {
        breakdown: m.breakdown ?? null,
        headline: m.nanny.ai_content?.headline ?? null,
      },
    })),
    ...wave3.map(m => ({
      position_id: position.id,
      nanny_id: m.nannyId,
      match_score: m.rawScore,
      distance_km: m.distanceKm,
      notification_method: 'email',
      notified_at: null,
      status: 'pending_wave',
      wave: 3,
      metadata: {
        breakdown: m.breakdown ?? null,
        headline: m.nanny.ai_content?.headline ?? null,
      },
    })),
  ];

  const { error: insertError } = await adminClient
    .from('dfy_match_notifications')
    .insert(allNotificationRows);

  if (insertError) {
    console.error('[DFY] Failed to insert notifications:', insertError);
    return { success: false, error: `Failed to create notifications: ${insertError.message}` };
  }

  // Only mark position as DFY-activated AFTER notifications succeed
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const wavesSent = [1];
  await adminClient
    .from('nanny_positions')
    .update({
      dfy_activated_at: now,
      dfy_expires_at: expiresAt,
      dfy_time_slots: timeSlots,
      dfy_wave_sent: wavesSent,
      updated_at: now,
    })
    .eq('id', position.id);

  // Get parent info for emails
  const { data: parentRecord } = await adminClient
    .from('parents')
    .select('user_id')
    .eq('id', parentId)
    .single();

  const parentProfile = parentRecord
    ? await getUserEmailInfo(parentRecord.user_id)
    : null;
  const parentName = parentProfile ? `${parentProfile.firstName}` : 'A family';
  const parentSuburb = position.suburb || '';

  // Send emails + inbox messages for wave 1 only
  const emailContext: DfyEmailContext = { parentName, parentSuburb, position };
  const { sent } = await sendDfyNotifications(wave1, emailContext);

  if (sent === 0 && wave1.length > 0) {
    return { success: false, error: 'Failed to send notification emails. Please try again or contact support.' };
  }

  revalidatePath('/parent/matches');
  revalidatePath('/parent/position');
  return { success: true, error: null, notifiedCount: sent };
}

// ════════════════════════════════════════════════════════════════════════════
// 3. GET DFY NOTIFICATIONS FOR NANNY
// ════════════════════════════════════════════════════════════════════════════

export async function getDfyNotificationsForNanny(): Promise<{
  data: DfyNotification[] | null;
  error: string | null;
}> {
  const nannyInfo = await getNannyId();
  if (!nannyInfo) {
    return { data: null, error: 'Not authenticated as nanny' };
  }

  const adminClient = createAdminClient();

  // Get active notifications
  const { data: notifications, error } = await adminClient
    .from('dfy_match_notifications')
    .select('id, position_id, match_score, distance_km, status, notified_at, viewed_at, responded_at, selected_time_slot')
    .eq('nanny_id', nannyInfo.nannyId)
    .in('status', ['notified', 'viewed', 'interested'])
    .order('match_score', { ascending: false });

  if (error) {
    console.error('[DFY] Error fetching nanny notifications:', error);
    return { data: null, error: 'Failed to fetch notifications.' };
  }

  if (!notifications || notifications.length === 0) {
    return { data: [], error: null };
  }

  // Get position details + parent info
  const positionIds = Array.from(new Set(notifications.map(n => n.position_id)));

  const { data: positions } = await adminClient
    .from('nanny_positions')
    .select('id, parent_id, suburb, schedule_type, hourly_rate, hours_per_week, days_required, level_of_support, urgency, start_date, placement_length, reason_for_nanny, language_preference, qualification_requirement, certificate_requirements, vaccination_required, drivers_license_required, car_required, comfortable_with_pets_required, non_smoker_required, other_requirements_details, description, dfy_time_slots')
    .in('id', positionIds);

  const { data: children } = await adminClient
    .from('position_children')
    .select('position_id, age_months, gender')
    .in('position_id', positionIds)
    .order('display_order', { ascending: true });

  // Get parent profiles
  const parentIds = Array.from(new Set((positions ?? []).map(p => p.parent_id)));
  const { data: parents } = await adminClient
    .from('parents')
    .select('id, user_id')
    .in('id', parentIds);

  const parentUserIds = (parents ?? []).map(p => p.user_id);
  const { data: parentProfiles } = await adminClient
    .from('user_profiles')
    .select('user_id, first_name, last_name, profile_picture_url')
    .in('user_id', parentUserIds);

  // Build lookup maps
  const positionMap = new Map((positions ?? []).map(p => [p.id, p]));
  const childrenMap = new Map<string, Array<{ ageMonths: number; gender: string | null }>>();
  for (const c of children ?? []) {
    const arr = childrenMap.get(c.position_id) ?? [];
    arr.push({ ageMonths: c.age_months, gender: c.gender });
    childrenMap.set(c.position_id, arr);
  }
  const parentMap = new Map((parents ?? []).map(p => [p.id, p]));
  const parentProfileMap = new Map((parentProfiles ?? []).map(p => [p.user_id, p]));

  const result: DfyNotification[] = notifications.map(n => {
    const pos = positionMap.get(n.position_id);
    const parent = pos ? parentMap.get(pos.parent_id) : null;
    const parentProfile = parent ? parentProfileMap.get(parent.user_id) : null;

    return {
      id: n.id,
      positionId: n.position_id,
      matchScore: n.match_score,
      distanceKm: n.distance_km,
      status: n.status,
      notifiedAt: n.notified_at,
      viewedAt: n.viewed_at,
      respondedAt: n.responded_at,
      selectedTimeSlot: n.selected_time_slot,
      position: {
        suburb: pos?.suburb ?? null,
        scheduleType: pos?.schedule_type ?? null,
        hourlyRate: pos?.hourly_rate ?? null,
        hoursPerWeek: pos?.hours_per_week ?? null,
        daysRequired: pos?.days_required ?? null,
        levelOfSupport: pos?.level_of_support ?? null,
        urgency: pos?.urgency ?? null,
        startDate: pos?.start_date ?? null,
        placementLength: pos?.placement_length ?? null,
        reasonForNanny: pos?.reason_for_nanny ?? null,
        languagePreference: pos?.language_preference ?? null,
        qualificationRequirement: pos?.qualification_requirement ?? null,
        certificateRequirements: pos?.certificate_requirements ?? null,
        vaccinationRequired: pos?.vaccination_required ?? null,
        driversLicenseRequired: pos?.drivers_license_required ?? null,
        carRequired: pos?.car_required ?? null,
        comfortableWithPetsRequired: pos?.comfortable_with_pets_required ?? null,
        nonSmokerRequired: pos?.non_smoker_required ?? null,
        otherRequirements: pos?.other_requirements_details ?? null,
        description: pos?.description ?? null,
        children: childrenMap.get(n.position_id) ?? [],
      },
      parent: {
        firstName: parentProfile?.first_name ?? 'Family',
        lastName: parentProfile?.last_name ?? '',
        profilePicUrl: parentProfile?.profile_picture_url ?? null,
      },
      availableTimeSlots: pos?.dfy_time_slots ?? [],
    };
  });

  return { data: result, error: null };
}

// ════════════════════════════════════════════════════════════════════════════
// 4. RESPOND TO DFY MATCH (Nanny)
// ════════════════════════════════════════════════════════════════════════════

export async function respondToDfyMatch(
  notificationId: string,
  selectedSlot: string
): Promise<{ success: boolean; error: string | null }> {
  const adminClient = createAdminClient();

  const nannyInfo = await getNannyId();
  if (!nannyInfo) {
    return { success: false, error: 'Not authenticated as nanny' };
  }

  // Fetch notification
  const { data: notification, error: fetchErr } = await adminClient
    .from('dfy_match_notifications')
    .select('id, position_id, nanny_id, status')
    .eq('id', notificationId)
    .eq('nanny_id', nannyInfo.nannyId)
    .single();

  if (fetchErr || !notification) {
    return { success: false, error: 'Notification not found.' };
  }

  if (notification.status !== 'notified' && notification.status !== 'viewed') {
    return { success: false, error: 'This notification has already been responded to.' };
  }

  // Validate slot format (ISO UTC string or legacy bracket format)
  if (selectedSlot.includes('T')) {
    const d = new Date(selectedSlot);
    if (isNaN(d.getTime())) return { success: false, error: 'Invalid time slot format.' };
  } else {
    const parts = selectedSlot.split('_');
    if (parts.length !== 2) return { success: false, error: 'Invalid slot format.' };
    const [date, bracket] = parts;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { success: false, error: 'Invalid date format.' };
    if (!BRACKET_KEYS.includes(bracket as BracketKey)) return { success: false, error: 'Invalid time bracket.' };
  }

  // Validate slot is in position's available slots
  const { data: position } = await adminClient
    .from('nanny_positions')
    .select('dfy_time_slots, dfy_expires_at, parent_id, suburb')
    .eq('id', notification.position_id)
    .single();

  // Check if DFY has expired
  if (position?.dfy_expires_at && new Date(position.dfy_expires_at) <= new Date()) {
    await expireDfyNotifications(notification.position_id);
    return { success: false, error: 'This opportunity has expired. The family\'s search window has closed.' };
  }

  if (!position?.dfy_time_slots?.includes(selectedSlot)) {
    return { success: false, error: 'Selected time slot is not available for this position.' };
  }

  // Update notification
  const now = new Date().toISOString();
  const { error: updateErr } = await adminClient
    .from('dfy_match_notifications')
    .update({
      status: 'interested',
      responded_at: now,
      selected_time_slot: selectedSlot,
      updated_at: now,
    })
    .eq('id', notificationId)
    .in('status', ['notified', 'viewed']);

  if (updateErr) {
    console.error('[DFY] Respond error:', updateErr);
    return { success: false, error: 'Failed to submit response.' };
  }

  // Get nanny name for parent notification
  const nannyEmailInfo = await getUserEmailInfo(nannyInfo.userId);
  const nannyName = nannyEmailInfo ? nannyEmailInfo.firstName : 'A nanny';

  // Notify parent
  const { data: parentData } = await adminClient
    .from('parents')
    .select('user_id')
    .eq('id', position.parent_id)
    .single();

  if (parentData) {
    // Inbox message
    await createInboxMessage({
      userId: parentData.user_id,
      type: 'dfy_nanny_interested',
      title: `${nannyName} is interested in your position!`,
      body: `${nannyName} has expressed interest and selected a preferred time for an intro call. Review their profile on your dashboard.`,
      actionUrl: '/parent/position',
      referenceId: notificationId,
      referenceType: 'dfy_match_notification',
    });

    // DFY-002 email (fire-and-forget)
    const parentEmailInfo = await getUserEmailInfo(parentData.user_id);
    if (parentEmailInfo) {
      const slotDisplay = formatSlotForDisplay(selectedSlot);
      sendEmail({
        to: parentEmailInfo.email,
        subject: `${nannyName} is interested in your position!`,
        html: `<div style="${BASE_STYLE}">
          <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">${nannyName} has expressed interest in your nanny position and is available for an intro call.</p>
          <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: 600; color: #166534;">Preferred Time: ${slotDisplay}</p>
          </div>
          <p style="color: #374151; font-size: 14px;">Review their profile and approve or decline on your dashboard.</p>
          <p style="margin-top: 24px;"><a href="${APP_URL}/parent/position" style="${BTN_STYLE}">Review Applicant</a></p>
        </div>`,
        emailType: 'dfy_parent_applicant',
        recipientUserId: parentData.user_id,
      }).catch(err => console.error('[DFY] DFY-002 email error:', err));
    }
  }

  revalidatePath('/nanny/positions');
  return { success: true, error: null };
}

// ════════════════════════════════════════════════════════════════════════════
// 5. MARK DFY NOTIFICATION VIEWED (Nanny)
// ════════════════════════════════════════════════════════════════════════════

export async function markDfyNotificationViewed(
  notificationId: string
): Promise<{ success: boolean; error: string | null }> {
  const adminClient = createAdminClient();

  const nannyInfo = await getNannyId();
  if (!nannyInfo) {
    return { success: false, error: 'Not authenticated as nanny' };
  }

  const now = new Date().toISOString();

  await adminClient
    .from('dfy_match_notifications')
    .update({
      status: 'viewed',
      viewed_at: now,
      updated_at: now,
    })
    .eq('id', notificationId)
    .eq('nanny_id', nannyInfo.nannyId)
    .eq('status', 'notified');

  return { success: true, error: null };
}

// ════════════════════════════════════════════════════════════════════════════
// 6. GET DFY APPLICANTS (Parent)
// ════════════════════════════════════════════════════════════════════════════

export async function getDfyApplicants(
  positionId: string
): Promise<{ data: DfyApplicant[] | null; error: string | null }> {
  const parentId = await getParentId();
  if (!parentId) {
    return { data: null, error: 'Not authenticated as parent' };
  }

  const adminClient = createAdminClient();

  // Verify parent owns this position
  const { data: position } = await adminClient
    .from('nanny_positions')
    .select('id')
    .eq('id', positionId)
    .eq('parent_id', parentId)
    .single();

  if (!position) {
    return { data: null, error: 'Position not found.' };
  }

  // Get interested notifications
  const { data: notifications, error } = await adminClient
    .from('dfy_match_notifications')
    .select('id, nanny_id, match_score, distance_km, selected_time_slot, responded_at, metadata')
    .eq('position_id', positionId)
    .eq('status', 'interested')
    .order('match_score', { ascending: false });

  if (error) {
    console.error('[DFY] Error fetching applicants:', error);
    return { data: null, error: 'Failed to fetch applicants.' };
  }

  if (!notifications || notifications.length === 0) {
    return { data: [], error: null };
  }

  // Get nanny profiles
  const nannyIds = notifications.map(n => n.nanny_id);
  const { data: nannies } = await adminClient
    .from('nannies')
    .select('id, user_id, hourly_rate_min, total_experience_years, ai_content, wwcc_verified')
    .in('id', nannyIds);

  const nannyMap = new Map((nannies ?? []).map(n => [n.id, n]));

  const nannyUserIds = (nannies ?? []).map(n => n.user_id);
  const { data: profiles } = await adminClient
    .from('user_profiles')
    .select('user_id, first_name, last_name, suburb, profile_picture_url, date_of_birth')
    .in('user_id', nannyUserIds);

  const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));

  // Fetch availability schedules
  const { data: availabilityRows } = await adminClient
    .from('nanny_availability')
    .select('nanny_id, schedule')
    .in('nanny_id', nannyIds);

  const availabilityMap = new Map(
    (availabilityRows ?? []).map(a => [
      a.nanny_id,
      normalizeNannySchedule(a.schedule as Record<string, unknown>),
    ])
  );

  const result: DfyApplicant[] = notifications.map(n => {
    const nanny = nannyMap.get(n.nanny_id);
    const profile = nanny ? profileMap.get(nanny.user_id) : null;

    const meta = n.metadata as Record<string, unknown> | null;
    const bd = meta?.breakdown as { experience: number; schedule: number; location: number } | undefined;

    return {
      notificationId: n.id,
      nannyId: n.nanny_id,
      matchScore: n.match_score,
      distanceKm: n.distance_km,
      selectedTimeSlot: n.selected_time_slot,
      respondedAt: n.responded_at,
      breakdown: bd ?? null,
      nanny: {
        firstName: profile?.first_name ?? 'Nanny',
        lastName: profile?.last_name ?? '',
        suburb: profile?.suburb ?? null,
        profilePicUrl: profile?.profile_picture_url ?? null,
        hourlyRateMin: nanny?.hourly_rate_min ?? null,
        experienceYears: nanny?.total_experience_years ?? null,
        aiHeadline: nanny?.ai_content?.headline ?? null,
        dateOfBirth: profile?.date_of_birth ?? null,
        wwccVerified: nanny?.wwcc_verified ?? false,
        schedule: availabilityMap.get(n.nanny_id) ?? null,
      },
    };
  });

  return { data: result, error: null };
}

// ════════════════════════════════════════════════════════════════════════════
// 7. APPROVE DFY APPLICANT (Parent)
// ════════════════════════════════════════════════════════════════════════════

export async function approveDfyApplicant(
  notificationId: string
): Promise<{ success: boolean; error: string | null; connectionId?: string }> {
  const adminClient = createAdminClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  // Get notification
  const { data: notification, error: fetchErr } = await adminClient
    .from('dfy_match_notifications')
    .select('id, position_id, nanny_id, selected_time_slot, status')
    .eq('id', notificationId)
    .single();

  if (fetchErr || !notification) {
    return { success: false, error: 'Notification not found.' };
  }

  if (notification.status !== 'interested') {
    return { success: false, error: 'This nanny has not expressed interest.' };
  }

  // Verify parent owns the position
  const { data: position } = await adminClient
    .from('nanny_positions')
    .select('id, parent_id, stage')
    .eq('id', notification.position_id)
    .eq('parent_id', parentId)
    .single();

  if (!position) {
    return { success: false, error: 'Position not found.' };
  }

  // Check for existing connection with same nanny
  const { data: existingConnection } = await adminClient
    .from('connection_requests')
    .select('id')
    .eq('parent_id', parentId)
    .eq('nanny_id', notification.nanny_id)
    .in('status', ['pending', 'accepted', 'confirmed'])
    .maybeSingle();

  if (existingConnection) {
    return { success: false, error: 'You already have an active connection with this nanny.' };
  }

  // Get nanny data
  const { data: nanny } = await adminClient
    .from('nannies')
    .select('id, user_id')
    .eq('id', notification.nanny_id)
    .single();

  if (!nanny) {
    return { success: false, error: 'Nanny not found.' };
  }

  // Get phone numbers
  const phone = await getNannyPhone(nanny.user_id);

  const { data: parentRecord } = await adminClient
    .from('parents')
    .select('user_id')
    .eq('id', parentId)
    .single();

  const parentPhone = parentRecord ? await getParentPhone(parentRecord.user_id) : null;

  // Determine if the selected time slot is still valid
  const confirmedTime = slotToConfirmedTime(notification.selected_time_slot);
  const nowIso = new Date().toISOString();
  const isSlotPast = new Date(confirmedTime) <= new Date();

  // Check if slot is already taken by another approved connection
  let isSlotTaken = false;
  if (!isSlotPast) {
    const { data: conflictingConnection } = await adminClient
      .from('connection_requests')
      .select('id')
      .eq('position_id', notification.position_id)
      .eq('confirmed_time', confirmedTime)
      .in('status', ['confirmed', 'accepted'])
      .not('connection_stage', 'in', `(${CONNECTION_STAGE.NOT_HIRED},${CONNECTION_STAGE.NOT_SELECTED},${CONNECTION_STAGE.CANCELLED_BY_PARENT},${CONNECTION_STAGE.CANCELLED_BY_NANNY})`)
      .maybeSingle();
    isSlotTaken = !!conflictingConnection;
  }

  const isSlotStale = isSlotPast || isSlotTaken;

  // ── Stale slot: fallback to REQUEST_SENT → nanny proposes new times ──
  if (isSlotStale) {
    const { data: connection, error: insertErr } = await adminClient
      .from('connection_requests')
      .insert({
        parent_id: parentId,
        nanny_id: notification.nanny_id,
        position_id: notification.position_id,
        status: 'pending',
        connection_stage: CONNECTION_STAGE.REQUEST_SENT,
        proposed_times: [],
        source: 'dfy',
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (insertErr || !connection) {
      console.error('[DFY] Failed to create fallback connection:', insertErr);
      return { success: false, error: 'Failed to create connection.' };
    }

    funnelLog('dfyApprove', connection.id, 'DFY → REQUEST_SENT (0) [stale slot]', {
      nannyId: notification.nanny_id, parentId,
      positionId: notification.position_id, source: 'dfy',
      reason: isSlotPast ? 'slot_past' : 'slot_taken',
    });

    // Update notification status
    await adminClient
      .from('dfy_match_notifications')
      .update({ status: 'approved', updated_at: nowIso })
      .eq('id', notificationId);

    // Move position to Connecting if still Open
    if (position.stage === POSITION_STAGE.OPEN) {
      await adminClient
        .from('nanny_positions')
        .update({ stage: POSITION_STAGE.CONNECTING, position_status: POSITION_STATUS.CONNECTING })
        .eq('id', position.id)
        .eq('stage', POSITION_STAGE.OPEN);
    }

    await logConnectionEvent({
      connectionRequestId: connection.id,
      parentId, nannyId: notification.nanny_id,
      eventType: 'dfy_approved_stale_slot',
      eventData: { source: 'dfy', reason: isSlotPast ? 'slot_past' : 'slot_taken' },
    });

    // Notify nanny to propose new times
    const nannyEmailInfo = await getUserEmailInfo(nanny.user_id);
    const parentProfileForInbox = parentRecord ? await getUserEmailInfo(parentRecord.user_id) : null;
    const parentNameForInbox = parentProfileForInbox ? `the ${parentProfileForInbox.lastName} family` : 'a family';

    await createInboxMessage({
      userId: nanny.user_id,
      type: 'connection_request',
      title: `${parentNameForInbox} approved your interest!`,
      body: 'The original time is no longer available. Please suggest your available times for a 15-minute intro call.',
      actionUrl: '/nanny/positions',
      referenceId: connection.id,
      referenceType: 'connection_request',
    });

    if (nannyEmailInfo) {
      sendEmail({
        to: nannyEmailInfo.email,
        subject: `Great news — ${parentNameForInbox} wants to connect!`,
        html: `<div style="${BASE_STYLE}">
          <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${nannyEmailInfo.firstName},</p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Great news! ${parentNameForInbox} loved your profile and approved your interest. The original time slot is no longer available, so please suggest your available times for a 15-minute intro call.</p>
          <p style="margin-top: 24px;"><a href="${APP_URL}/nanny/positions" style="${BTN_STYLE}">Suggest Times</a></p>
        </div>`,
        emailType: 'dfy_stale_slot_request',
        recipientUserId: nanny.user_id,
      }).catch(err => console.error('[DFY] Stale slot email error:', err));
    }

    revalidatePath('/parent/position');
    revalidatePath('/parent/connections');
    revalidatePath('/nanny/positions');
    revalidatePath('/nanny/inbox');
    return { success: true, error: null, connectionId: connection.id };
  }

  // ── Valid slot: proceed with INTRO_SCHEDULED flow ──
  const { data: connection, error: insertErr } = await adminClient
    .from('connection_requests')
    .insert({
      parent_id: parentId,
      nanny_id: notification.nanny_id,
      position_id: notification.position_id,
      status: 'confirmed',
      connection_stage: CONNECTION_STAGE.INTRO_SCHEDULED,
      proposed_times: [],
      confirmed_time: confirmedTime,
      confirmed_at: nowIso,
      nanny_phone_shared: phone,
      parent_phone_shared: parentPhone,
      source: 'dfy',
    })
    .select('id')
    .single();

  if (insertErr || !connection) {
    console.error('[DFY] Failed to create connection:', insertErr);
    return { success: false, error: 'Failed to create connection.' };
  }

  funnelLog('dfyApprove', connection.id, 'DFY → INTRO_SCHEDULED (20)', {
    nannyId: notification.nanny_id,
    parentId,
    positionId: notification.position_id,
    source: 'dfy',
  });

  // Update notification status
  await adminClient
    .from('dfy_match_notifications')
    .update({ status: 'approved', updated_at: nowIso })
    .eq('id', notificationId);

  // Move position to Connecting if still Open
  if (position.stage === POSITION_STAGE.OPEN) {
    await adminClient
      .from('nanny_positions')
      .update({
        stage: POSITION_STAGE.CONNECTING,
        position_status: POSITION_STATUS.CONNECTING,
      })
      .eq('id', position.id)
      .eq('stage', POSITION_STAGE.OPEN);
  }

  // Log event
  await logConnectionEvent({
    connectionRequestId: connection.id,
    parentId,
    nannyId: notification.nanny_id,
    eventType: 'dfy_approved',
    eventData: { confirmed_time: confirmedTime, source: 'dfy' },
  });

  // Get names for emails
  const nannyEmailInfo = await getUserEmailInfo(nanny.user_id);
  const nannyName = nannyEmailInfo ? `${nannyEmailInfo.firstName} ${nannyEmailInfo.lastName}` : 'Your nanny';
  const confirmedDate = formatSydneyDate(confirmedTime);

  if (parentRecord) {
    // Inbox message for parent
    await createInboxMessage({
      userId: parentRecord.user_id,
      type: 'connection_confirmed',
      title: `Intro call scheduled with ${nannyName}!`,
      body: `Your intro is set for ${confirmedDate}. View contact details on your dashboard.`,
      actionUrl: '/parent/connections',
      referenceId: connection.id,
      referenceType: 'connection_request',
      metadata: { phone, confirmed_time: confirmedTime },
    });

    // INT-002 email to parent
    const parentEmailInfo = await getUserEmailInfo(parentRecord.user_id);
    if (parentEmailInfo) {
      sendEmail({
        to: parentEmailInfo.email,
        subject: `Intro call scheduled with ${nannyName}!`,
        html: `<div style="${BASE_STYLE}">
          <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your 15-minute intro with ${nannyName} is confirmed.</p>
          <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: 600; color: #166534;">Call Time: ${confirmedDate}</p>
          </div>
          <p style="color: #374151; font-size: 14px;">Contact details are available on your Baby Bloom dashboard.</p>
          <p style="margin-top: 24px;"><a href="${APP_URL}/parent/connections" style="${BTN_STYLE}">View Details</a></p>
        </div>`,
        emailType: 'interview_confirmed',
        recipientUserId: parentRecord.user_id,
      }).catch(err => console.error('[DFY] INT-002 email error:', err));
    }
  }

  // Inbox message for nanny (include parent phone for call prompt)
  const parentProfileForInbox = parentRecord ? await getUserEmailInfo(parentRecord.user_id) : null;
  const parentNameForInbox = parentProfileForInbox ? `${parentProfileForInbox.firstName} ${parentProfileForInbox.lastName}` : 'the family';
  await createInboxMessage({
    userId: nanny.user_id,
    type: 'connection_confirmed_nanny',
    title: 'Intro call scheduled',
    body: parentPhone
      ? `Your intro is set for ${confirmedDate}. Please call ${parentNameForInbox} at ${parentPhone}.`
      : `Your intro is set for ${confirmedDate}. Contact details are on your dashboard.`,
    actionUrl: '/nanny/inbox',
    referenceId: connection.id,
    referenceType: 'connection_request',
    metadata: { confirmed_time: confirmedTime, parent_phone: parentPhone },
  });

  // INT-003 email to nanny — includes parent phone + call CTA
  if (nannyEmailInfo) {
    const parentName = parentNameForInbox;
    const phoneBlock = parentPhone
      ? `<div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0 0 4px; font-weight: 600; color: #166534;">Call ${parentName}</p>
          <p style="margin: 0; font-size: 20px; font-weight: 700; color: #166534;"><a href="tel:${parentPhone}" style="color: #166534; text-decoration: none;">${parentPhone}</a></p>
        </div>`
      : '';

    sendEmail({
      to: nannyEmailInfo.email,
      subject: `Intro call scheduled with ${parentName}`,
      html: `<div style="${BASE_STYLE}">
        <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">Great news! ${parentName} has approved your interest. Your 15-minute intro is confirmed.</p>
        <div style="background: #F5F3FF; border: 1px solid #C4B5FD; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="margin: 0; font-weight: 600; color: #5B21B6;">Call Time: ${confirmedDate}</p>
        </div>
        ${phoneBlock}
        <p style="color: #374151; font-size: 14px;">Please call the family at the scheduled time. The intro is a quick 15-minute chat so the family can get to know you.</p>
        <p style="margin-top: 24px;"><a href="${APP_URL}/nanny/inbox" style="${BTN_STYLE}">View in Inbox</a></p>
      </div>`,
      emailType: 'interview_confirmed',
      recipientUserId: nanny.user_id,
    }).catch(err => console.error('[DFY] INT-003 email error:', err));
  }

  revalidatePath('/parent/position');
  revalidatePath('/parent/connections');
  revalidatePath('/nanny/positions');
  revalidatePath('/nanny/inbox');
  return { success: true, error: null, connectionId: connection.id };
}

// ════════════════════════════════════════════════════════════════════════════
// 8. DECLINE DFY APPLICANT (Parent)
// ════════════════════════════════════════════════════════════════════════════

export async function declineDfyApplicant(
  notificationId: string
): Promise<{ success: boolean; error: string | null }> {
  const adminClient = createAdminClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  // Get notification
  const { data: notification, error: fetchErr } = await adminClient
    .from('dfy_match_notifications')
    .select('id, position_id, nanny_id, status')
    .eq('id', notificationId)
    .single();

  if (fetchErr || !notification) {
    return { success: false, error: 'Notification not found.' };
  }

  if (notification.status !== 'interested') {
    return { success: false, error: 'This nanny has not expressed interest.' };
  }

  // Verify parent owns the position
  const { data: position } = await adminClient
    .from('nanny_positions')
    .select('id')
    .eq('id', notification.position_id)
    .eq('parent_id', parentId)
    .single();

  if (!position) {
    return { success: false, error: 'Position not found.' };
  }

  // Update notification status
  const now = new Date().toISOString();
  await adminClient
    .from('dfy_match_notifications')
    .update({ status: 'declined', updated_at: now })
    .eq('id', notificationId);

  revalidatePath('/parent/position');
  return { success: true, error: null };
}

// ════════════════════════════════════════════════════════════════════════════
// 9. PROCESS DFY WAVES (Cron + lazy trigger)
// ════════════════════════════════════════════════════════════════════════════

export async function processDfyWaves(): Promise<{ processed: number }> {
  const adminClient = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();
  let processed = 0;

  // Find all active DFY positions
  const { data: positions } = await adminClient
    .from('nanny_positions')
    .select('id, parent_id, dfy_activated_at, dfy_expires_at, dfy_wave_sent, dfy_tier, suburb, schedule_type, hourly_rate, hours_per_week, days_required, level_of_support, urgency, start_date, placement_length, qualification_requirement, certificate_requirements, drivers_license_required, car_required, vaccination_required, non_smoker_required, comfortable_with_pets_required, language_preference, description')
    .not('dfy_activated_at', 'is', null)
    .gt('dfy_expires_at', nowIso);

  if (!positions || positions.length === 0) return { processed: 0 };

  for (const pos of positions) {
    const tier = (pos.dfy_tier as DfyTier) || 'standard';
    const config = DFY_TIERS[tier];
    const activatedAt = new Date(pos.dfy_activated_at);
    const wavesSent: number[] = (pos.dfy_wave_sent as number[]) ?? [];
    const daysSinceActivation = (now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Determine which waves are due (standard has only wave 1, already sent)
    const pendingWaves: number[] = [];
    if (daysSinceActivation >= 2 && !wavesSent.includes(2)) pendingWaves.push(2);
    if (daysSinceActivation >= 5 && !wavesSent.includes(3)) pendingWaves.push(3);

    if (pendingWaves.length === 0) continue;

    // Check interested count — skip remaining waves if threshold met
    const { count: interestedCount } = await adminClient
      .from('dfy_match_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('position_id', pos.id)
      .eq('status', 'interested');

    if ((interestedCount ?? 0) >= config.maxRespondents) {
      // Expire all remaining pending_wave rows
      await adminClient
        .from('dfy_match_notifications')
        .update({ status: 'expired', updated_at: nowIso })
        .eq('position_id', pos.id)
        .eq('status', 'pending_wave');

      // Mark all waves as "sent" to prevent re-checking
      await adminClient
        .from('nanny_positions')
        .update({ dfy_wave_sent: [1, 2, 3], updated_at: nowIso })
        .eq('id', pos.id);

      continue;
    }

    // Get parent info for emails
    const { data: parentRecord } = await adminClient
      .from('parents')
      .select('user_id')
      .eq('id', pos.parent_id)
      .single();

    const parentProfile = parentRecord
      ? await getUserEmailInfo(parentRecord.user_id)
      : null;
    const parentName = parentProfile ? `${parentProfile.firstName}` : 'A family';
    const parentSuburb = pos.suburb || '';

    // Get children for position
    const { data: children } = await adminClient
      .from('position_children')
      .select('age_months, gender')
      .eq('position_id', pos.id)
      .order('display_order', { ascending: true });

    for (const waveNum of pendingWaves) {
      // Fetch pending_wave rows for this wave
      const { data: waveRows } = await adminClient
        .from('dfy_match_notifications')
        .select('id, nanny_id, match_score')
        .eq('position_id', pos.id)
        .eq('wave', waveNum)
        .eq('status', 'pending_wave');

      if (!waveRows || waveRows.length === 0) {
        // No rows for this wave — just mark as sent
        const updatedWaves = [...wavesSent, waveNum];
        await adminClient
          .from('nanny_positions')
          .update({ dfy_wave_sent: updatedWaves, updated_at: nowIso })
          .eq('id', pos.id);
        wavesSent.push(waveNum);
        continue;
      }

      // Update status to 'notified' — optimistic lock on 'pending_wave' prevents duplicate sends
      const waveRowIds = waveRows.map(r => r.id);
      const { data: updatedRows } = await adminClient
        .from('dfy_match_notifications')
        .update({ status: 'notified', notified_at: nowIso, updated_at: nowIso })
        .in('id', waveRowIds)
        .eq('status', 'pending_wave')
        .select('id, nanny_id');

      // If 0 rows updated, another process already handled this wave
      if (!updatedRows || updatedRows.length === 0) {
        const updatedWaves = [...wavesSent, waveNum];
        await adminClient
          .from('nanny_positions')
          .update({ dfy_wave_sent: updatedWaves, updated_at: nowIso })
          .eq('id', pos.id);
        wavesSent.push(waveNum);
        continue;
      }

      // Get nanny user_ids for this wave (only for rows we actually updated)
      const nannyIds = updatedRows.map(r => r.nanny_id);
      const { data: nannies } = await adminClient
        .from('nannies')
        .select('id, user_id')
        .in('id', nannyIds);

      if (nannies && nannies.length > 0) {
        // Build MatchResult-like objects for the email helper
        const nannyUserIds = nannies.map(n => n.user_id);
        const { data: profiles } = await adminClient
          .from('user_profiles')
          .select('user_id, email, first_name')
          .in('user_id', nannyUserIds);

        const profileMap = new Map((profiles ?? []).map(p => [p.user_id, p]));
        const nannyMap = new Map(nannies.map(n => [n.id, n]));

        // Build email items directly (use updatedRows — only nannies we claimed)
        const emailItems = updatedRows
          .map(row => {
            const nanny = nannyMap.get(row.nanny_id);
            if (!nanny) return null;
            const profile = profileMap.get(nanny.user_id);
            if (!profile) return null;

            // Build position details for email (reuse same template)
            const childrenDisplay = (children ?? [])
              .map((c: { age_months: number }) => {
                if (c.age_months < 12) return `${c.age_months}mo`;
                return `${Math.floor(c.age_months / 12)}yr`;
              })
              .join(', ');

            const daysDisplay = pos.days_required?.join(', ') || '';
            const hoursDisplay = pos.hours_per_week ? `${pos.hours_per_week}h/week` : '';
            const rateDisplay = pos.hourly_rate ? `$${pos.hourly_rate}/hr` : 'Rate negotiable';
            const scheduleDisplay = pos.schedule_type || 'Flexible';
            const childCount = (children ?? []).length;

            return {
              to: profile.email,
              subject: `A family in ${parentSuburb} matched with you!`,
              html: `<div style="${BASE_STYLE}">
                <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${profile.first_name},</p>
                <p style="color: #374151; font-size: 16px; line-height: 1.6;">${parentName} from ${parentSuburb} is looking for a nanny and you're one of their top matches!</p>
                <div style="background: #F5F3FF; border: 1px solid #C4B5FD; border-radius: 8px; padding: 16px; margin: 16px 0;">
                  <p style="margin: 0 0 12px; font-weight: 600; color: #5B21B6;">Position Details</p>
                  <table style="width: 100%; font-size: 14px; color: #374151; border-collapse: collapse;">
                    <tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Children</td><td style="padding: 4px 0;">${childCount} ${childCount === 1 ? 'child' : 'children'} (${childrenDisplay})</td></tr>
                    <tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Schedule</td><td style="padding: 4px 0;">${scheduleDisplay}</td></tr>
                    <tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Rate</td><td style="padding: 4px 0;">${rateDisplay}</td></tr>
                    ${hoursDisplay ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Hours</td><td style="padding: 4px 0;">${hoursDisplay}</td></tr>` : ''}
                    ${daysDisplay ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Days</td><td style="padding: 4px 0;">${daysDisplay}</td></tr>` : ''}
                    ${parentSuburb ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Location</td><td style="padding: 4px 0;">${parentSuburb}</td></tr>` : ''}
                    ${pos.urgency ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Start</td><td style="padding: 4px 0;">${pos.urgency}${pos.start_date ? ` — ${pos.start_date}` : ''}</td></tr>` : ''}
                    ${pos.placement_length ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Duration</td><td style="padding: 4px 0;">${pos.placement_length}</td></tr>` : ''}
                    ${pos.level_of_support?.length ? `<tr><td style="padding: 4px 8px 4px 0; color: #6B7280;">Support</td><td style="padding: 4px 0;">${pos.level_of_support.join(', ')}</td></tr>` : ''}
                  </table>
                  ${pos.description ? `<p style="margin: 8px 0 0; font-size: 13px; color: #374151;">${pos.description}</p>` : ''}
                </div>
                <p style="color: #374151; font-size: 14px;">View the full position details and let the family know you're interested.</p>
                <p style="margin-top: 24px;"><a href="${APP_URL}/nanny/positions" style="${BTN_STYLE}">View Position & Respond</a></p>
              </div>`,
              emailType: 'dfy_nanny_notification',
              recipientUserId: nanny.user_id,
            };
          })
          .filter((e): e is NonNullable<typeof e> => e !== null);

        // Send batch emails
        const { sent, failed } = await sendBatchEmails(emailItems);
        if (failed > 0) {
          console.error(`[DFY-Wave] Wave ${waveNum}: ${sent} sent, ${failed} failed`);
        }

        // Create inbox messages
        await Promise.allSettled(
          nannies.map(n =>
            createInboxMessage({
              userId: n.user_id,
              type: 'dfy_match',
              title: `A family in ${parentSuburb} matched with you!`,
              body: `${parentName} is looking for a nanny and you're one of their top matches. View the position and respond.`,
              actionUrl: '/nanny/positions',
              referenceId: pos.id,
              referenceType: 'dfy_match_notification',
            })
          )
        );

        console.log(`[DFY-Wave] Position ${pos.id}: wave ${waveNum} sent to ${sent} nannies`);
      }

      // Follow-up reminders for priority tier — re-send email to earlier wave nannies who haven't responded
      if (config.followUpReminders && waveNum >= 2) {
        const { data: unresponsiveRows } = await adminClient
          .from('dfy_match_notifications')
          .select('id, nanny_id')
          .eq('position_id', pos.id)
          .lt('wave', waveNum)
          .in('status', ['notified', 'viewed']);

        if (unresponsiveRows && unresponsiveRows.length > 0) {
          const reminderNannyIds = unresponsiveRows.map(r => r.nanny_id);
          const { data: reminderNannies } = await adminClient
            .from('nannies')
            .select('id, user_id')
            .in('id', reminderNannyIds);

          if (reminderNannies && reminderNannies.length > 0) {
            const reminderUserIds = reminderNannies.map(n => n.user_id);
            const { data: reminderProfiles } = await adminClient
              .from('user_profiles')
              .select('user_id, email, first_name')
              .in('user_id', reminderUserIds);

            const reminderProfileMap = new Map((reminderProfiles ?? []).map(p => [p.user_id, p]));
            const reminderNannyMap = new Map(reminderNannies.map(n => [n.id, n]));

            const reminderEmails = unresponsiveRows
              .map(row => {
                const nanny = reminderNannyMap.get(row.nanny_id);
                if (!nanny) return null;
                const profile = reminderProfileMap.get(nanny.user_id);
                if (!profile) return null;

                return {
                  to: profile.email,
                  subject: `Reminder: A family in ${parentSuburb} is still looking for a nanny`,
                  html: `<div style="${BASE_STYLE}">
                    <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${profile.first_name},</p>
                    <p style="color: #374151; font-size: 16px; line-height: 1.6;">${parentName} from ${parentSuburb} is still looking for a nanny. You were matched as one of their top candidates — let them know if you're interested!</p>
                    <p style="margin-top: 24px;"><a href="${APP_URL}/nanny/positions" style="${BTN_STYLE}">View Position & Respond</a></p>
                  </div>`,
                  emailType: 'dfy_nanny_reminder' as const,
                  recipientUserId: nanny.user_id,
                };
              })
              .filter((e): e is NonNullable<typeof e> => e !== null);

            if (reminderEmails.length > 0) {
              const { sent: reminderSent } = await sendBatchEmails(reminderEmails);
              console.log(`[DFY-Wave] Position ${pos.id}: wave ${waveNum} reminder sent to ${reminderSent} unresponsive nannies`);
            }
          }
        }
      }

      // Update dfy_wave_sent
      const updatedWaves = [...wavesSent, waveNum];
      await adminClient
        .from('nanny_positions')
        .update({ dfy_wave_sent: updatedWaves, updated_at: nowIso })
        .eq('id', pos.id);
      wavesSent.push(waveNum);

      processed++;
    }
  }

  return { processed };
}

// ════════════════════════════════════════════════════════════════════════════
// 10. GET DFY STATUS FOR POSITION (Parent)
// ════════════════════════════════════════════════════════════════════════════

export async function getDfyStatus(): Promise<{
  activated: boolean;
  activatedAt: string | null;
  expiresAt: string | null;
  expired: boolean;
  notifiedCount: number;
  interestedCount: number;
  approvedCount: number;
  hasPendingShare: boolean;
  tier: 'standard' | 'priority' | null;
  maxRespondents: number;
}> {
  const defaultResult = {
    activated: false, activatedAt: null, expiresAt: null, expired: false,
    notifiedCount: 0, interestedCount: 0, approvedCount: 0, hasPendingShare: false,
    tier: null as 'standard' | 'priority' | null, maxRespondents: DFY_TIERS.standard.maxRespondents,
  };

  const parentId = await getParentId();
  if (!parentId) return defaultResult;

  const adminClient = createAdminClient();

  const { data: position } = await adminClient
    .from('nanny_positions')
    .select('id, dfy_activated_at, dfy_expires_at, dfy_wave_sent, dfy_time_slots, dfy_tier')
    .eq('parent_id', parentId)
    .in('status', ['active', 'filled'])
    .maybeSingle();

  if (!position) return defaultResult;

  // Check if time slots are saved but DFY not yet activated (pending share)
  const hasPendingShare = !!(position.dfy_time_slots && position.dfy_time_slots.length > 0 && !position.dfy_activated_at);

  if (!position.dfy_activated_at) return { ...defaultResult, hasPendingShare };

  const activatedTier = (position.dfy_tier as DfyTier) || 'standard';
  const tierConfig = DFY_TIERS[activatedTier];

  // Check if expired and trigger lazy cleanup
  const isExpired = position.dfy_expires_at
    ? new Date(position.dfy_expires_at) <= new Date()
    : false;

  if (isExpired) {
    await expireDfyNotifications(position.id, parentId);
  }

  // Lazy wave trigger — fire pending waves on parent page visit
  if (!isExpired) {
    await processDfyWaves();
  }

  // Get counts by status (re-fetch after potential wave processing)
  const { data: notifications } = await adminClient
    .from('dfy_match_notifications')
    .select('status')
    .eq('position_id', position.id);

  let interestedCount = 0;
  let approvedCount = 0;

  for (const n of notifications ?? []) {
    if (n.status === 'interested') interestedCount++;
    if (n.status === 'approved') approvedCount++;
  }

  return {
    activated: true,
    activatedAt: position.dfy_activated_at,
    expiresAt: position.dfy_expires_at,
    expired: isExpired,
    notifiedCount: (notifications ?? []).length,
    interestedCount,
    approvedCount,
    hasPendingShare: false,
    tier: activatedTier,
    maxRespondents: tierConfig.maxRespondents,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// 10. EXPIRE DFY NOTIFICATIONS (Internal lazy trigger)
// ════════════════════════════════════════════════════════════════════════════

async function expireDfyNotifications(
  positionId: string,
  parentId?: string
): Promise<{ expired: boolean }> {
  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  // Check if DFY has expired
  const { data: position } = await adminClient
    .from('nanny_positions')
    .select('id, dfy_activated_at, dfy_expires_at, parent_id')
    .eq('id', positionId)
    .single();

  if (!position || !position.dfy_expires_at) return { expired: false };
  if (new Date(position.dfy_expires_at) > new Date()) return { expired: false };

  // Bulk update: 'notified'/'viewed'/'pending_wave' → 'expired'
  // Leave 'interested' untouched — parent can still approve/decline
  const { data: expiredNotifs } = await adminClient
    .from('dfy_match_notifications')
    .update({ status: 'expired', updated_at: now })
    .eq('position_id', positionId)
    .in('status', ['notified', 'viewed', 'pending_wave'])
    .select('id');

  // Send parent notification only when we actually expired rows (avoids duplicate sends)
  if (expiredNotifs && expiredNotifs.length > 0) {
    const resolvedParentId = parentId || position.parent_id;
    const { data: parentRecord } = await adminClient
      .from('parents')
      .select('user_id')
      .eq('id', resolvedParentId)
      .single();

    if (parentRecord) {
      await createInboxMessage({
        userId: parentRecord.user_id,
        type: 'dfy_expired',
        title: 'Your Done For You search has completed',
        body: 'All matched nannies have been notified about your position. You can boost your position again or browse and connect with nannies from your matches.',
        actionUrl: '/parent/matches',
        referenceId: positionId,
        referenceType: 'nanny_position',
      });

      const parentEmailInfo = await getUserEmailInfo(parentRecord.user_id);
      if (parentEmailInfo) {
        sendEmail({
          to: parentEmailInfo.email,
          subject: 'Your Done For You search has completed',
          html: `<div style="${BASE_STYLE}">
            <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Hi ${parentEmailInfo.firstName},</p>
            <p style="color: #374151; font-size: 16px; line-height: 1.6;">Your Done For You search has completed &mdash; all matched nannies have been notified about your position.</p>
            <div style="background: #F5F3FF; border: 1px solid #C4B5FD; border-radius: 8px; padding: 16px; margin: 16px 0;">
              <p style="margin: 0; font-size: 14px; color: #5B21B6; font-weight: 600;">What&rsquo;s next?</p>
              <ul style="margin: 8px 0 0; padding-left: 20px; font-size: 14px; color: #374151;">
                <li>Boost your position again to reach more nannies</li>
                <li>Browse and connect with nannies from your matches</li>
              </ul>
            </div>
            <p style="margin-top: 24px;"><a href="${APP_URL}/parent/matches" style="${BTN_STYLE}">View Matches</a></p>
          </div>`,
          emailType: 'dfy_expired',
          recipientUserId: parentRecord.user_id,
        }).catch(err => console.error('[DFY] Expiry email error:', err));
      }
    }
  }

  return { expired: true };
}

// ════════════════════════════════════════════════════════════════════════════
// 11. SAVE DFY TIME SLOTS (Parent) — stage slots without triggering DFY
// ════════════════════════════════════════════════════════════════════════════

export async function saveDfyTimeSlots(
  timeSlots: string[]
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createAdminClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  // Get active position
  const { data: position, error: positionError } = await getPosition();
  if (positionError || !position) {
    return { success: false, error: positionError || 'No active position found' };
  }

  // Validate time slots
  if (!timeSlots || timeSlots.length < 3) {
    return { success: false, error: 'Please select at least 3 preferred time slots.' };
  }

  for (const slot of timeSlots) {
    const d = new Date(slot);
    if (isNaN(d.getTime())) {
      return { success: false, error: 'Invalid time slot format.' };
    }
  }

  // Store time slots on position (but do NOT activate DFY yet)
  const now = new Date().toISOString();
  const { error: updateError } = await adminClient
    .from('nanny_positions')
    .update({
      dfy_time_slots: timeSlots,
      updated_at: now,
    })
    .eq('id', position.id);

  if (updateError) {
    console.error('[saveDfyTimeSlots] Update error:', updateError);
    return { success: false, error: 'Failed to save time slots.' };
  }

  // Auto-create viral_shares record at READY if it doesn't exist
  const { createShareRecord } = await import('@/lib/actions/viral-loop');
  const { SHARE_CASE_TYPE } = await import('@/lib/viral-loop/constants');
  await createShareRecord(SHARE_CASE_TYPE.PARENT_POSITION, position.id);

  revalidatePath('/parent/matches');
  return { success: true };
}

// ════════════════════════════════════════════════════════════════════════════
// 11b. CONFIRM MATCHMAKING (activate DFY without share proof)
// ════════════════════════════════════════════════════════════════════════════

export async function confirmMatchmaking(): Promise<{ success: boolean; error?: string }> {
  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  const { data: position, error: positionError } = await getPosition();
  if (positionError || !position) {
    return { success: false, error: positionError || 'No active position found' };
  }

  // Check position has time slots saved
  const adminClient = createAdminClient();
  const { data: pos } = await adminClient
    .from('nanny_positions')
    .select('id, dfy_time_slots, dfy_activated_at')
    .eq('id', position.id)
    .single();

  if (!pos?.dfy_time_slots || !Array.isArray(pos.dfy_time_slots) || pos.dfy_time_slots.length < 3) {
    return { success: false, error: 'Please select at least 3 time slots first.' };
  }

  if (pos.dfy_activated_at) {
    return { success: false, error: 'Matchmaking is already active.' };
  }

  // Activate DFY directly (without share proof) — standard tier
  await activateDfyPosition(pos.id, 'standard');

  revalidatePath('/parent/matches');
  return { success: true };
}

// ════════════════════════════════════════════════════════════════════════════
// 12. ACTIVATE DFY POSITION (called when share is approved)
// ════════════════════════════════════════════════════════════════════════════

export async function activateDfyPosition(positionId: string, tier: DfyTier = 'standard'): Promise<void> {
  const adminClient = createAdminClient();
  const config = DFY_TIERS[tier];

  // Get position + stored dfy_time_slots
  const { data: position } = await adminClient
    .from('nanny_positions')
    .select('id, dfy_time_slots, dfy_activated_at, parent_id')
    .eq('id', positionId)
    .single();

  if (!position) {
    console.error('[activateDfyPosition] Position not found:', positionId);
    return;
  }

  if (!position.dfy_time_slots || position.dfy_time_slots.length === 0) {
    console.error('[activateDfyPosition] No time slots stored for position:', positionId);
    return;
  }

  // Check DFY status — allow re-trigger only after expiry
  if (position.dfy_activated_at) {
    const { data: posData } = await adminClient
      .from('nanny_positions')
      .select('dfy_expires_at')
      .eq('id', positionId)
      .single();

    if (posData?.dfy_expires_at && new Date(posData.dfy_expires_at) > new Date()) {
      console.log('[activateDfyPosition] DFY still active, skipping:', positionId);
      return;
    }
  }

  // Run matching algorithm — standard uses basic (distance + schedule), priority uses full
  const { matches } = tier === 'priority'
    ? await runMatchmaking(positionId)
    : await runBasicMatchmaking(positionId);

  // Exclude nannies with existing active connections
  const { data: existingConnections } = await adminClient
    .from('connection_requests')
    .select('nanny_id')
    .eq('position_id', positionId)
    .in('status', ['pending', 'accepted', 'confirmed']);

  // Also exclude ALL previously notified nannies
  const { data: previouslyNotified } = await adminClient
    .from('dfy_match_notifications')
    .select('nanny_id')
    .eq('position_id', positionId);

  const excludedNannyIds = new Set([
    ...(existingConnections ?? []).map(c => c.nanny_id),
    ...(previouslyNotified ?? []).map(n => n.nanny_id),
  ]);

  // Take top N matches based on tier
  const topMatches = matches
    .filter(m => !excludedNannyIds.has(m.nannyId))
    .slice(0, config.totalNannies);

  if (topMatches.length === 0) {
    console.log('[activateDfyPosition] No eligible nannies found for:', positionId);
    return;
  }

  const now = new Date().toISOString();

  // Build notification rows — standard: 1 wave (all notified), priority: 3 waves
  let allNotificationRows;
  if (tier === 'standard') {
    // Standard: single wave, all nannies notified immediately
    allNotificationRows = topMatches.map(m => ({
      position_id: positionId,
      nanny_id: m.nannyId,
      match_score: m.rawScore,
      distance_km: m.distanceKm,
      notification_method: 'email',
      notified_at: now,
      status: 'notified',
      wave: 1,
      metadata: {
        breakdown: m.breakdown ?? null,
        headline: m.nanny.ai_content?.headline ?? null,
      },
    }));
  } else {
    // Priority: 3 waves — ~17 per wave
    const perWave = Math.ceil(config.totalNannies / config.waves);
    const wave1 = topMatches.slice(0, perWave);
    const wave2 = topMatches.slice(perWave, perWave * 2);
    const wave3 = topMatches.slice(perWave * 2);

    allNotificationRows = [
      ...wave1.map(m => ({
        position_id: positionId,
        nanny_id: m.nannyId,
        match_score: m.rawScore,
        distance_km: m.distanceKm,
        notification_method: 'email',
        notified_at: now,
        status: 'notified',
        wave: 1,
        metadata: {
          breakdown: m.breakdown ?? null,
          headline: m.nanny.ai_content?.headline ?? null,
        },
      })),
      ...wave2.map(m => ({
        position_id: positionId,
        nanny_id: m.nannyId,
        match_score: m.rawScore,
        distance_km: m.distanceKm,
        notification_method: 'email',
        notified_at: null,
        status: 'pending_wave',
        wave: 2,
        metadata: {
          breakdown: m.breakdown ?? null,
          headline: m.nanny.ai_content?.headline ?? null,
        },
      })),
      ...wave3.map(m => ({
        position_id: positionId,
        nanny_id: m.nannyId,
        match_score: m.rawScore,
        distance_km: m.distanceKm,
        notification_method: 'email',
        notified_at: null,
        status: 'pending_wave',
        wave: 3,
        metadata: {
          breakdown: m.breakdown ?? null,
          headline: m.nanny.ai_content?.headline ?? null,
        },
      })),
    ];
  }

  const { error: insertError } = await adminClient
    .from('dfy_match_notifications')
    .insert(allNotificationRows);

  if (insertError) {
    console.error('[activateDfyPosition] Failed to insert notifications:', insertError);
    return;
  }

  // Mark position as DFY-activated
  const expiresAt = new Date(Date.now() + config.expiryDays * 24 * 60 * 60 * 1000).toISOString();
  await adminClient
    .from('nanny_positions')
    .update({
      dfy_activated_at: now,
      dfy_expires_at: expiresAt,
      dfy_wave_sent: [1],
      dfy_tier: tier,
      updated_at: now,
    })
    .eq('id', positionId);

  // Get parent info for emails
  const { data: parentRecord } = await adminClient
    .from('parents')
    .select('user_id')
    .eq('id', position.parent_id)
    .single();

  const parentProfile = parentRecord
    ? await getUserEmailInfo(parentRecord.user_id)
    : null;
  const parentName = parentProfile ? `${parentProfile.firstName}` : 'A family';

  // Get position details for emails
  const { data: positionDetails } = await adminClient
    .from('nanny_positions')
    .select('id, suburb, schedule_type, hourly_rate, hours_per_week, days_required, level_of_support, urgency, start_date, placement_length, qualification_requirement, certificate_requirements, drivers_license_required, car_required, vaccination_required, non_smoker_required, comfortable_with_pets_required, language_preference, description')
    .eq('id', positionId)
    .single();

  const parentSuburb = positionDetails?.suburb || '';

  // Get children for email context
  const { data: children } = await adminClient
    .from('position_children')
    .select('age_months')
    .eq('position_id', positionId);

  const emailContext: DfyEmailContext = {
    parentName,
    parentSuburb,
    position: positionDetails ? { ...positionDetails, children: children ?? [] } : null,
  };

  // Send emails + inbox messages for wave 1 only
  const wave1Matches = tier === 'standard'
    ? topMatches
    : topMatches.slice(0, Math.ceil(config.totalNannies / config.waves));
  await sendDfyNotifications(wave1Matches, emailContext);

  console.log(`[activateDfyPosition] DFY activated (${tier}) for position ${positionId}: ${wave1Matches.length} nannies notified (wave 1)`);
}

// ════════════════════════════════════════════════════════════════════════════
// 13. GET PUBLIC POSITION PROFILE (for OG image + public page)
// ════════════════════════════════════════════════════════════════════════════

export interface PublicPositionProfile {
  id: string;
  suburb: string | null;
  hourlyRate: number | null;
  hoursPerWeek: number | null;
  daysRequired: string[] | null;
  scheduleType: string | null;
  children: Array<{ ageMonths: number; gender: string | null }>;
  parentFirstName: string;
  parentLastName: string | null;
  parentProfilePic: string | null;
}

export async function getPublicPositionProfile(positionId: string): Promise<{
  data: PublicPositionProfile | null;
  error: string | null;
}> {
  const admin = createAdminClient();

  const { data: position, error: posErr } = await admin
    .from('nanny_positions')
    .select('id, parent_id, suburb, hourly_rate, hours_per_week, days_required, schedule_type')
    .eq('id', positionId)
    .maybeSingle();

  if (posErr || !position) return { data: null, error: 'Position not found' };

  // Get children
  const { data: children } = await admin
    .from('position_children')
    .select('age_months, gender')
    .eq('position_id', positionId)
    .order('display_order', { ascending: true });

  // Get parent's name + profile pic (via parents → user_profiles)
  const { data: parent } = await admin
    .from('parents')
    .select('user_id')
    .eq('id', position.parent_id)
    .single();

  let parentFirstName = 'A family';
  let parentLastName: string | null = null;
  let parentProfilePic: string | null = null;

  if (parent) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('first_name, last_name, profile_picture_url')
      .eq('user_id', parent.user_id)
      .maybeSingle();

    if (profile) {
      parentFirstName = profile.first_name ?? 'A family';
      parentLastName = profile.last_name ?? null;
      parentProfilePic = profile.profile_picture_url ?? null;
    }
  }

  return {
    data: {
      id: position.id,
      suburb: position.suburb,
      hourlyRate: position.hourly_rate ? Number(position.hourly_rate) : null,
      hoursPerWeek: position.hours_per_week ? Number(position.hours_per_week) : null,
      daysRequired: position.days_required,
      scheduleType: position.schedule_type,
      children: (children ?? []).map(c => ({ ageMonths: c.age_months, gender: c.gender })),
      parentFirstName,
      parentLastName,
      parentProfilePic,
    },
    error: null,
  };
}
