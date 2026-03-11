import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { NannyHubClient } from '@/components/hub/NannyHubClient';

export default async function NannyHubPage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const admin = createAdminClient();

  // First: get profile + nanny record (needed for subsequent queries)
  const [profileRes, nannyRes] = await Promise.all([
    admin.from('user_profiles').select('first_name, last_name, profile_picture_url, suburb').eq('user_id', user.id).single(),
    admin.from('nannies').select('id, verification_level, visible_in_bsr').eq('user_id', user.id).single(),
  ]);

  const nannyId = nannyRes.data?.id;
  const shareRes = await admin.from('viral_shares').select('share_status').eq('user_id', user.id).eq('case_type', 'nanny_profile').maybeSingle();

  // Second: fetch data that depends on nannyId
  let aiHeadline: string | null = null;
  let aiParentPitch: string | null = null;
  let connectionsCount = 0;
  let bsrCount = 0;

  if (nannyId) {
    const [aiContentRes, connRes, bsrNotifRes] = await Promise.all([
      admin.from('nanny_ai_content').select('headline, parent_pitch').eq('nanny_id', nannyId).maybeSingle(),
      admin.from('connection_requests').select('id', { count: 'exact', head: true }).eq('nanny_id', nannyId).in('status', ['pending', 'accepted', 'confirmed']),
      admin.from('bsr_notifications').select('id', { count: 'exact', head: true }).eq('nanny_id', nannyId).eq('status', 'notified'),
    ]);
    aiHeadline = aiContentRes.data?.headline || null;
    aiParentPitch = aiContentRes.data?.parent_pitch || null;
    connectionsCount = connRes.count || 0;
    bsrCount = bsrNotifRes.count || 0;
  }

  return (
    <NannyHubClient
      firstName={profileRes.data?.first_name || 'there'}
      lastName={profileRes.data?.last_name || ''}
      profilePictureUrl={profileRes.data?.profile_picture_url || null}
      suburb={profileRes.data?.suburb || ''}
      verificationLevel={nannyRes.data?.verification_level ?? 0}
      visibleInBsr={nannyRes.data?.visible_in_bsr ?? false}
      aiHeadline={aiHeadline}
      aiParentPitch={aiParentPitch}
      shareStatus={shareRes.data?.share_status ?? 0}
      connectionsCount={connectionsCount}
      bsrCount={bsrCount}
    />
  );
}
