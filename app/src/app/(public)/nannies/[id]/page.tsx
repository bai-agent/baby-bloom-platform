import { getPublicNannyProfile } from "@/lib/actions/nanny";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HIDDEN_CONNECTION_STAGES } from "@/lib/position/constants";
import { NannyProfileView } from "./NannyProfileView";
import { notFound } from "next/navigation";

export default async function NannyProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const { data: nanny, error } = await getPublicNannyProfile(params.id);

  if (error || !nanny) {
    notFound();
  }

  // Check auth state for connect button logic
  let isOwner = false;
  let isParent = false;
  let pendingRequestCount = 0;
  let existingRequestStatus: string | null = null;
  let hasActivePlacement = false;
  let isActiveNanny = false;

  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      if (user.id === nanny.user_id) {
        isOwner = true;
      } else {
        // Check if user is a parent
        const { data: role } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (role?.role === 'parent') {
          isParent = true;

          // Look up parent table ID (connection_requests.parent_id = parents.id, NOT auth.users.id)
          const adminClient = createAdminClient();
          const { data: parentRecord } = await adminClient
            .from('parents')
            .select('id')
            .eq('user_id', user.id)
            .single();

          if (parentRecord) {
            // Count pending connection requests
            const { count } = await adminClient
              .from('connection_requests')
              .select('id', { count: 'exact', head: true })
              .eq('parent_id', parentRecord.id)
              .eq('status', 'pending');

            pendingRequestCount = count ?? 0;

            // Check existing request with this nanny (exclude terminal stages)
            const { data: existing } = await adminClient
              .from('connection_requests')
              .select('status, connection_stage')
              .eq('parent_id', parentRecord.id)
              .eq('nanny_id', nanny.nanny_id)
              .in('status', ['pending', 'accepted', 'confirmed'])
              .not('connection_stage', 'in', `(${HIDDEN_CONNECTION_STAGES.join(',')})`)
              .limit(1)
              .maybeSingle();

            existingRequestStatus = existing?.status ?? null;

            // Check if parent has any active placement
            const { data: activePlacement } = await adminClient
              .from('nanny_placements')
              .select('id, nanny_id')
              .eq('parent_id', parentRecord.id)
              .eq('status', 'active')
              .limit(1)
              .maybeSingle();

            if (activePlacement) {
              hasActivePlacement = true;
              if (activePlacement.nanny_id === nanny.nanny_id) {
                isActiveNanny = true;
              }
            }
          }
        }
      }
    }
  } catch {
    // Not authenticated — that's fine
  }

  return (
    <NannyProfileView
      nanny={nanny}
      isOwner={isOwner}
      isParent={isParent}
      pendingRequestCount={pendingRequestCount}
      existingRequestStatus={existingRequestStatus}
      hasActivePlacement={hasActivePlacement}
      isActiveNanny={isActiveNanny}
    />
  );
}
