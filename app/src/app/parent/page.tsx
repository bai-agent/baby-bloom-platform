import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ParentHubClient } from '@/components/hub/ParentHubClient';

export default async function ParentHubPage() {
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const admin = createAdminClient();

  // First: get profile + parent record
  const [profileRes, parentRes] = await Promise.all([
    admin.from('user_profiles').select('first_name, last_name, profile_picture_url').eq('user_id', user.id).single(),
    admin.from('parents').select('id').eq('user_id', user.id).single(),
  ]);

  const parentId = parentRes.data?.id;

  let verificationStatus = 0;
  let positionId: string | null = null;
  let connectionsCount = 0;
  let bsrCount = 0;

  if (parentId) {
    // Fetch verification, position, connections, BSR counts in parallel
    const [verifRes, positionRes] = await Promise.all([
      admin.from('parent_verifications').select('verification_status').eq('parent_id', parentId).maybeSingle(),
      admin.from('nanny_positions').select('id, status').eq('parent_id', parentId).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);

    verificationStatus = verifRes.data?.verification_status ?? 0;
    positionId = positionRes.data?.id || null;

    // Fetch counts that depend on position
    const [connRes, bsrRes] = await Promise.all([
      positionId
        ? admin.from('connection_requests').select('id', { count: 'exact', head: true }).eq('position_id', positionId).in('status', ['pending', 'accepted', 'confirmed'])
        : Promise.resolve({ count: 0 }),
      admin.from('babysitting_requests').select('id', { count: 'exact', head: true }).eq('parent_id', parentId).in('status', ['open', 'filled']),
    ]);

    connectionsCount = connRes.count || 0;
    bsrCount = bsrRes.count || 0;
  }

  return (
    <ParentHubClient
      firstName={profileRes.data?.first_name || 'there'}
      isVerified={verificationStatus >= 20}
      hasPosition={!!positionId}
      connectionsCount={connectionsCount}
      bsrCount={bsrCount}
    />
  );
}
