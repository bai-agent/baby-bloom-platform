import { getPublicNannyProfile } from "@/lib/actions/nanny";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

            // Check existing request with this nanny
            const { data: existing } = await adminClient
              .from('connection_requests')
              .select('status')
              .eq('parent_id', parentRecord.id)
              .eq('nanny_id', nanny.nanny_id)
              .in('status', ['pending', 'accepted', 'confirmed'])
              .limit(1)
              .maybeSingle();

            existingRequestStatus = existing?.status ?? null;
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
    />
  );
}
