"use server";

import { createClient } from "@/lib/supabase/server";
import type { AccessLevel } from "@/lib/access-level";

/**
 * Fetch the current user's access level from their profile.
 * Returns null if unauthenticated or no profile found.
 */
export async function getUserAccessLevel(): Promise<AccessLevel | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("access_level")
    .eq("id", user.id)
    .single();

  return (data?.access_level as AccessLevel) ?? "sisters";
}
