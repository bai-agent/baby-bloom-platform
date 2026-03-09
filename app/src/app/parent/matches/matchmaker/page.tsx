import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { MatchmakerClient } from "./MatchmakerClient";

export default async function MatchmakerPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const admin = createAdminClient();

  const { data: parent } = await admin
    .from("parents")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!parent) redirect("/parent/matches");

  const { data: position } = await admin
    .from("nanny_positions")
    .select("dfy_time_slots")
    .eq("parent_id", parent.id)
    .in("status", ["active", "filled"])
    .maybeSingle();

  const existingSlots: string[] =
    position?.dfy_time_slots && Array.isArray(position.dfy_time_slots)
      ? position.dfy_time_slots
      : [];

  return <MatchmakerClient initialSlots={existingSlots} />;
}
