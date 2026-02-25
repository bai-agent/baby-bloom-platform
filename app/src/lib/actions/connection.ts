'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { getParentId } from './parent';
import { getNannyPhone, getPositionSummary, createInboxMessage, logConnectionEvent } from './connection-helpers';
import { sendEmail } from '@/lib/email/resend';
import { getUserEmailInfo } from '@/lib/email/helpers';

// ── Types ──

export interface ConnectionRequest {
  id: string;
  parent_id: string;
  nanny_id: string;
  position_id: string | null;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'expired';
  proposed_times: string[];
  confirmed_time: string | null;
  confirmed_at: string | null;
  message: string | null;
  decline_reason: string | null;
  nanny_phone_shared: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionRequestWithDetails extends ConnectionRequest {
  nanny?: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    suburb: string;
    hourly_rate_min: number | null;
    profile_picture_url: string | null;
  };
  parent?: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    suburb: string;
  };
  position?: Awaited<ReturnType<typeof getPositionSummary>>;
}

// ── Helper: get nanny ID for current user ──

async function getNannyId(): Promise<{ nannyId: string; userId: string } | null> {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: nanny, error } = await supabase
    .from('nannies')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (error || !nanny) return null;
  return { nannyId: nanny.id, userId: user.id };
}

// ── Helper: expire stale pending requests ──

async function expireStaleRequests(
  supabase: ReturnType<typeof createAdminClient>,
  filter: { nanny_id?: string; parent_id?: string }
): Promise<void> {
  const now = new Date().toISOString();

  const query = supabase
    .from('connection_requests')
    .select('id, parent_id, nanny_id')
    .eq('status', 'pending')
    .lt('expires_at', now);

  if (filter.nanny_id) query.eq('nanny_id', filter.nanny_id);
  if (filter.parent_id) query.eq('parent_id', filter.parent_id);

  const { data: stale } = await query;

  for (const req of stale ?? []) {
    await supabase
      .from('connection_requests')
      .update({ status: 'expired', updated_at: now })
      .eq('id', req.id)
      .eq('status', 'pending');

    // Get user IDs for inbox messages
    const { data: nannyData } = await supabase
      .from('nannies')
      .select('user_id')
      .eq('id', req.nanny_id)
      .single();

    const { data: parentData } = await supabase
      .from('parents')
      .select('user_id')
      .eq('id', req.parent_id)
      .single();

    if (parentData) {
      await createInboxMessage({
        userId: parentData.user_id,
        type: 'connection_expired',
        title: 'Connection request expired',
        body: 'Your connection request has expired as the nanny did not respond in time.',
        actionUrl: '/parent/connections',
        referenceId: req.id,
        referenceType: 'connection_request',
      });
    }

    if (nannyData) {
      await createInboxMessage({
        userId: nannyData.user_id,
        type: 'connection_expired',
        title: 'Missed connection request',
        body: 'A connection request has expired. Responding promptly helps families find the right nanny.',
        actionUrl: '/nanny/inbox',
        referenceId: req.id,
        referenceType: 'connection_request',
      });
    }

    await logConnectionEvent({
      connectionRequestId: req.id,
      parentId: req.parent_id,
      nannyId: req.nanny_id,
      eventType: 'expired',
    });
  }
}

// ── 1. Create Connection Request ──

export async function createConnectionRequest(
  nannyId: string,
  proposedTimes: string[],
  message?: string
): Promise<{ success: boolean; error: string | null; requestId?: string }> {
  const supabase = createClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  // Check for active position (optional — not required for testing)
  const { data: position } = await supabase
    .from('nanny_positions')
    .select('id')
    .eq('parent_id', parentId)
    .eq('status', 'active')
    .maybeSingle();

  // Max 5 pending requests
  const { count } = await supabase
    .from('connection_requests')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', parentId)
    .eq('status', 'pending');

  if (count !== null && count >= 5) {
    return { success: false, error: 'You have reached the maximum of 5 open connection requests. Wait for a response or cancel an existing request.' };
  }

  // No duplicate with same nanny
  const { data: existing } = await supabase
    .from('connection_requests')
    .select('id')
    .eq('parent_id', parentId)
    .eq('nanny_id', nannyId)
    .in('status', ['pending', 'confirmed'])
    .single();

  if (existing) {
    return { success: false, error: 'You already have an active connection request with this nanny.' };
  }

  // Validate proposed times
  if (proposedTimes.length !== 3) {
    return { success: false, error: 'Please propose exactly 3 times.' };
  }

  const now = Date.now();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const sevenDays = 7 * 24 * 60 * 60 * 1000;

  for (const time of proposedTimes) {
    const t = new Date(time).getTime();
    if (isNaN(t)) return { success: false, error: 'Invalid date format.' };
    if (t < now + twentyFourHours) return { success: false, error: 'All proposed times must be at least 24 hours from now.' };
    if (t > now + sevenDays) return { success: false, error: 'All proposed times must be within the next 7 days.' };
  }

  // Calculate expires_at: earliest proposed time - 12 hours
  const sortedTimes = proposedTimes.map(t => new Date(t).getTime()).sort((a, b) => a - b);
  const expiresAt = new Date(sortedTimes[0] - 12 * 60 * 60 * 1000).toISOString();

  // Insert
  const { data: request, error } = await supabase
    .from('connection_requests')
    .insert({
      parent_id: parentId,
      nanny_id: nannyId,
      position_id: position?.id ?? null,
      status: 'pending',
      proposed_times: proposedTimes,
      message: message || null,
      expires_at: expiresAt,
    })
    .select('id')
    .single();

  if (error) {
    console.error('[Connection] Create error:', error);
    return { success: false, error: 'Failed to create connection request.' };
  }

  // Get nanny's user_id for inbox + email
  const adminClient = createAdminClient();
  const { data: nanny } = await adminClient
    .from('nannies')
    .select('user_id')
    .eq('id', nannyId)
    .single();

  if (nanny) {
    // Log event
    await logConnectionEvent({
      connectionRequestId: request.id,
      parentId,
      nannyId,
      eventType: 'created',
      eventData: { proposed_times: proposedTimes, message: message || null },
    });

    // Inbox message for nanny
    await createInboxMessage({
      userId: nanny.user_id,
      type: 'connection_request',
      title: 'New connection request',
      body: 'A family would like to connect with you for a 15-minute intro call.',
      actionUrl: '/nanny/inbox',
      referenceId: request.id,
      referenceType: 'connection_request',
    });

    // INT-001 email (fire-and-forget)
    const nannyInfo = await getUserEmailInfo(nanny.user_id);
    if (nannyInfo) {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: parentProfile } = await adminClient
        .from('user_profiles')
        .select('first_name, last_name, suburb')
        .eq('user_id', user!.id)
        .single();

      const parentName = parentProfile ? `${parentProfile.first_name} ${parentProfile.last_name}` : 'A family';
      const parentSuburb = parentProfile?.suburb || '';
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app-babybloom.vercel.app';
      const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;`;
      const btnStyle = `background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;`;

      sendEmail({
        to: nannyInfo.email,
        subject: `New connection request from ${parentName}`,
        html: `<div style="${baseStyle}">
          <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] INT-001 — New Connection Request. ${parentName} from ${parentSuburb} would like to connect for a 15-minute intro call. Review their position and respond before this request expires.</p>
          <p style="margin-top: 24px;"><a href="${appUrl}/nanny/inbox" style="${btnStyle}">View Request</a></p>
        </div>`,
        emailType: 'interview_request',
        recipientUserId: nanny.user_id,
      }).catch(err => console.error('[Connection] INT-001 email error:', err));
    }
  }

  revalidatePath('/parent/connections');
  return { success: true, error: null, requestId: request.id };
}

// ── 2. Confirm Connection Request (Nanny accepts + selects time) ──

export async function confirmConnectionRequest(
  requestId: string,
  selectedTime: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  const adminClient = createAdminClient();

  const nannyInfo = await getNannyId();
  if (!nannyInfo) {
    return { success: false, error: 'Not authenticated as nanny' };
  }

  // Fetch request
  const { data: request, error: fetchErr } = await supabase
    .from('connection_requests')
    .select('id, parent_id, nanny_id, proposed_times, status')
    .eq('id', requestId)
    .eq('nanny_id', nannyInfo.nannyId)
    .single();

  if (fetchErr || !request) {
    return { success: false, error: 'Connection request not found.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request is no longer pending.' };
  }

  // Validate selectedTime is one of proposed_times
  const proposedTimes = request.proposed_times as string[];
  if (!proposedTimes.includes(selectedTime)) {
    return { success: false, error: 'Selected time is not one of the proposed times.' };
  }

  // Get nanny's phone number
  const phone = await getNannyPhone(nannyInfo.userId);
  if (!phone) {
    return { success: false, error: 'Your phone number is required to confirm. Please update your contact details in Verification.' };
  }

  const now = new Date().toISOString();

  // Update request
  const { error: updateErr } = await adminClient
    .from('connection_requests')
    .update({
      status: 'confirmed',
      confirmed_time: selectedTime,
      confirmed_at: now,
      nanny_phone_shared: phone,
      responded_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (updateErr) {
    console.error('[Connection] Confirm error:', updateErr);
    return { success: false, error: 'Failed to confirm connection.' };
  }

  // Log event
  await logConnectionEvent({
    connectionRequestId: requestId,
    parentId: request.parent_id,
    nannyId: request.nanny_id,
    eventType: 'confirmed',
    eventData: { selected_time: selectedTime, phone_shared: phone },
  });

  // Get user IDs for inbox + emails
  const { data: parentData } = await adminClient
    .from('parents')
    .select('user_id')
    .eq('id', request.parent_id)
    .single();

  const nannyEmailInfo = await getUserEmailInfo(nannyInfo.userId);
  const nannyName = nannyEmailInfo ? `${nannyEmailInfo.firstName} ${nannyEmailInfo.lastName}` : 'Your nanny';

  const confirmedDate = new Date(selectedTime).toLocaleDateString('en-AU', {
    weekday: 'long', day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit',
  });

  if (parentData) {
    // Inbox message for parent
    await createInboxMessage({
      userId: parentData.user_id,
      type: 'connection_confirmed',
      title: `${nannyName} confirmed your intro call!`,
      body: `Your intro call is set for ${confirmedDate}. Phone: ${phone}`,
      actionUrl: '/parent/connections',
      referenceId: requestId,
      referenceType: 'connection_request',
      metadata: { phone, confirmed_time: selectedTime },
    });

    // INT-002 email to parent (with phone + time)
    const parentEmailInfo = await getUserEmailInfo(parentData.user_id);
    if (parentEmailInfo) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app-babybloom.vercel.app';
      const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;`;
      const btnStyle = `background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;`;

      sendEmail({
        to: parentEmailInfo.email,
        subject: `${nannyName} confirmed your intro call!`,
        html: `<div style="${baseStyle}">
          <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] INT-002 — Connection Confirmed (to parent). ${nannyName} has confirmed your 15-minute intro call.</p>
          <div style="background: #F0FDF4; border: 1px solid #86EFAC; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; font-weight: 600; color: #166534;">Call Time: ${confirmedDate}</p>
            <p style="margin: 8px 0 0; font-weight: 600; color: #166534;">Phone: ${phone}</p>
          </div>
          <p style="color: #374151; font-size: 14px;">Please call ${nannyName} at the confirmed time.</p>
          <p style="margin-top: 24px;"><a href="${appUrl}/parent/connections" style="${btnStyle}">View Details</a></p>
        </div>`,
        emailType: 'interview_confirmed',
        recipientUserId: parentData.user_id,
      }).catch(err => console.error('[Connection] INT-002 email error:', err));
    }
  }

  // Inbox message for nanny
  await createInboxMessage({
    userId: nannyInfo.userId,
    type: 'connection_confirmed_nanny',
    title: 'Intro call confirmed',
    body: `Your intro call is set for ${confirmedDate}. Your phone number has been shared with the family.`,
    actionUrl: '/nanny/inbox',
    referenceId: requestId,
    referenceType: 'connection_request',
  });

  // INT-003 email to nanny
  if (nannyEmailInfo) {
    const parentProfile = parentData ? await getUserEmailInfo(parentData.user_id) : null;
    const parentName = parentProfile ? `${parentProfile.firstName} ${parentProfile.lastName}` : 'the family';
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app-babybloom.vercel.app';
    const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;`;
    const btnStyle = `background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;`;

    sendEmail({
      to: nannyEmailInfo.email,
      subject: `Intro call confirmed with ${parentName}`,
      html: `<div style="${baseStyle}">
        <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
        <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] INT-003 — Connection Confirmed (to nanny). Your 15-minute intro call with ${parentName} is confirmed for ${confirmedDate}. Your phone number (${phone}) has been shared — they will call you at the confirmed time.</p>
        <p style="margin-top: 24px;"><a href="${appUrl}/nanny/inbox" style="${btnStyle}">View in Inbox</a></p>
      </div>`,
      emailType: 'interview_confirmed',
      recipientUserId: nannyInfo.userId,
    }).catch(err => console.error('[Connection] INT-003 email error:', err));
  }

  revalidatePath('/nanny/inbox');
  revalidatePath('/parent/connections');
  revalidatePath('/parent/inbox');
  return { success: true, error: null };
}

// ── 3. Decline Connection Request ──

export async function declineConnectionRequest(
  requestId: string,
  reason?: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  const adminClient = createAdminClient();

  const nannyInfo = await getNannyId();
  if (!nannyInfo) {
    return { success: false, error: 'Not authenticated as nanny' };
  }

  const now = new Date().toISOString();

  const { data: request, error: fetchErr } = await supabase
    .from('connection_requests')
    .select('id, parent_id, nanny_id, status')
    .eq('id', requestId)
    .eq('nanny_id', nannyInfo.nannyId)
    .single();

  if (fetchErr || !request) {
    return { success: false, error: 'Connection request not found.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'This request is no longer pending.' };
  }

  const { error: updateErr } = await adminClient
    .from('connection_requests')
    .update({
      status: 'declined',
      decline_reason: reason || null,
      responded_at: now,
      updated_at: now,
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (updateErr) {
    console.error('[Connection] Decline error:', updateErr);
    return { success: false, error: 'Failed to decline connection.' };
  }

  // Log event
  await logConnectionEvent({
    connectionRequestId: requestId,
    parentId: request.parent_id,
    nannyId: request.nanny_id,
    eventType: 'declined',
    eventData: reason ? { reason } : {},
  });

  // Inbox message for parent (neutral — no reason shown)
  const { data: parentData } = await adminClient
    .from('parents')
    .select('user_id')
    .eq('id', request.parent_id)
    .single();

  const nannyEmailInfo = await getUserEmailInfo(nannyInfo.userId);
  const nannyName = nannyEmailInfo ? nannyEmailInfo.firstName : 'The nanny';

  if (parentData) {
    await createInboxMessage({
      userId: parentData.user_id,
      type: 'connection_declined',
      title: `Update on your connection request`,
      body: `${nannyName} is unable to connect at this time. This could be due to scheduling or availability.`,
      actionUrl: '/parent/connections',
      referenceId: requestId,
      referenceType: 'connection_request',
    });

    // INT-004 email to parent (neutral, no reason)
    const parentEmailInfo = await getUserEmailInfo(parentData.user_id);
    if (parentEmailInfo) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app-babybloom.vercel.app';
      const baseStyle = `font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;`;
      const btnStyle = `background: #8B5CF6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;`;

      sendEmail({
        to: parentEmailInfo.email,
        subject: `Update on your connection with ${nannyName}`,
        html: `<div style="${baseStyle}">
          <h1 style="color: #8B5CF6; font-size: 24px; margin-bottom: 16px;">Baby Bloom Sydney</h1>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">[TBD] INT-004 — Connection Declined (to parent). Unfortunately, ${nannyName} is unable to connect at this time. This could be due to scheduling or availability.</p>
          <p style="margin-top: 24px;"><a href="${appUrl}/parent/browse" style="${btnStyle}">Browse More Nannies</a></p>
        </div>`,
        emailType: 'interview_request',
        recipientUserId: parentData.user_id,
      }).catch(err => console.error('[Connection] INT-004 email error:', err));
    }
  }

  revalidatePath('/nanny/inbox');
  revalidatePath('/parent/connections');
  revalidatePath('/parent/inbox');
  return { success: true, error: null };
}

// ── 4. Cancel Connection Request (Parent) ──

export async function cancelConnectionRequest(
  requestId: string
): Promise<{ success: boolean; error: string | null }> {
  const supabase = createClient();
  const adminClient = createAdminClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { success: false, error: 'Not authenticated as parent' };
  }

  const { data: request, error: fetchErr } = await supabase
    .from('connection_requests')
    .select('id, parent_id, nanny_id, status')
    .eq('id', requestId)
    .eq('parent_id', parentId)
    .single();

  if (fetchErr || !request) {
    return { success: false, error: 'Connection request not found.' };
  }

  if (request.status !== 'pending') {
    return { success: false, error: 'Only pending requests can be cancelled.' };
  }

  const { error: updateErr } = await supabase
    .from('connection_requests')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (updateErr) {
    console.error('[Connection] Cancel error:', updateErr);
    return { success: false, error: 'Failed to cancel connection request.' };
  }

  // Log event
  await logConnectionEvent({
    connectionRequestId: requestId,
    parentId: request.parent_id,
    nannyId: request.nanny_id,
    eventType: 'cancelled',
  });

  // Inbox message for nanny
  const { data: nannyData } = await adminClient
    .from('nannies')
    .select('user_id')
    .eq('id', request.nanny_id)
    .single();

  if (nannyData) {
    await createInboxMessage({
      userId: nannyData.user_id,
      type: 'connection_cancelled',
      title: 'Connection request cancelled',
      body: 'A family has cancelled their connection request.',
      actionUrl: '/nanny/inbox',
      referenceId: requestId,
      referenceType: 'connection_request',
    });
  }

  revalidatePath('/parent/connections');
  revalidatePath('/nanny/inbox');
  return { success: true, error: null };
}

// ── 5. Get Parent Connection Requests ──

export async function getParentConnectionRequests(): Promise<{ data: ConnectionRequestWithDetails[]; error: string | null }> {
  const supabase = createClient();
  const adminClient = createAdminClient();

  const parentId = await getParentId();
  if (!parentId) {
    return { data: [], error: 'Not authenticated as parent' };
  }

  // Lazy expire stale requests
  await expireStaleRequests(adminClient, { parent_id: parentId });

  const { data, error } = await supabase
    .from('connection_requests')
    .select(`
      *,
      nannies!inner (
        id,
        user_id,
        hourly_rate_min,
        user_profiles!inner (
          first_name,
          last_name,
          suburb,
          profile_picture_url
        )
      )
    `)
    .eq('parent_id', parentId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Connection] Parent fetch error:', error);
    return { data: [], error: 'Failed to fetch connection requests.' };
  }

  const requests: ConnectionRequestWithDetails[] = (data || []).map((req) => {
    const profile = req.nannies.user_profiles as unknown as {
      first_name: string; last_name: string; suburb: string; profile_picture_url: string | null;
    };
    return {
      ...req,
      nanny: {
        id: req.nannies.id,
        user_id: req.nannies.user_id,
        first_name: profile.first_name,
        last_name: profile.last_name,
        suburb: profile.suburb,
        hourly_rate_min: req.nannies.hourly_rate_min,
        profile_picture_url: profile.profile_picture_url,
      },
      nannies: undefined,
    } as ConnectionRequestWithDetails;
  });

  return { data: requests, error: null };
}

// ── 6. Get Nanny Connection Requests ──

export async function getNannyConnectionRequests(): Promise<{ data: ConnectionRequestWithDetails[]; error: string | null }> {
  const supabase = createClient();
  const adminClient = createAdminClient();

  const nannyInfo = await getNannyId();
  if (!nannyInfo) {
    return { data: [], error: 'Not authenticated as nanny' };
  }

  // Lazy expire stale requests
  await expireStaleRequests(adminClient, { nanny_id: nannyInfo.nannyId });

  const { data, error } = await supabase
    .from('connection_requests')
    .select(`
      *,
      parents!inner (
        id,
        user_id,
        user_profiles!inner (
          first_name,
          last_name,
          suburb
        )
      )
    `)
    .eq('nanny_id', nannyInfo.nannyId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Connection] Nanny fetch error:', error);
    return { data: [], error: 'Failed to fetch connection requests.' };
  }

  // Enrich with position data
  const requests: ConnectionRequestWithDetails[] = await Promise.all(
    (data || []).map(async (req) => {
      const profile = req.parents.user_profiles as unknown as {
        first_name: string; last_name: string; suburb: string;
      };

      let position = null;
      if (req.position_id) {
        position = await getPositionSummary(req.position_id);
      }

      return {
        ...req,
        parent: {
          id: req.parents.id,
          user_id: req.parents.user_id,
          first_name: profile.first_name,
          last_name: profile.last_name,
          suburb: profile.suburb,
        },
        position,
        parents: undefined,
      } as ConnectionRequestWithDetails;
    })
  );

  return { data: requests, error: null };
}
