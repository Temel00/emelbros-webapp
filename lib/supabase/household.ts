"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Returns the household_id for the currently authenticated user.
 * Throws if the user is not authenticated or has no household.
 */
export async function getUserHouseholdId(): Promise<string> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data, error } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error("No household found for user");
  }

  return data.household_id;
}
