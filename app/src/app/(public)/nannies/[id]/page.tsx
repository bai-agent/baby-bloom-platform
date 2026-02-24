import { getPublicNannyProfile } from "@/lib/actions/nanny";
import { createClient } from "@/lib/supabase/server";
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

  // Check if current user owns this profile
  let isOwner = false;
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user && user.id === nanny.user_id) {
      isOwner = true;
    }
  } catch {
    // Not authenticated — that's fine, just not the owner
  }

  return <NannyProfileView nanny={nanny} isOwner={isOwner} />;
}
