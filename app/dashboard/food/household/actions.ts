"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserHouseholdId } from "@/lib/supabase/household";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type HouseholdMember = {
  id: string;
  user_id: string;
  role: "owner" | "member";
  joined_at: string;
  email: string;
  full_name: string | null;
};

export type HouseholdInvite = {
  id: string;
  invited_email: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
};

export type Household = {
  id: string;
  name: string;
  created_by: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchHouseholdData(): Promise<{
  household: Household | null;
  members: HouseholdMember[];
  invites: HouseholdInvite[];
  currentUserId: string;
}> {
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [householdResult, membersResult, invitesResult] = await Promise.all([
    supabase
      .from("households")
      .select("id, name, created_by")
      .eq("id", householdId)
      .single(),
    supabase
      .from("household_members")
      .select("id, user_id, role, joined_at")
      .eq("household_id", householdId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("household_invites")
      .select("id, invited_email, status, created_at")
      .eq("household_id", householdId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const household = householdResult.data as Household | null;
  const rawMembers = (membersResult.data ?? []) as {
    id: string;
    user_id: string;
    role: "owner" | "member";
    joined_at: string;
  }[];

  // Fetch user details from profiles table
  const userIds = rawMembers.map((m) => m.user_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, email, display_name")
    .in("id", userIds);

  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, p]),
  );

  const members: HouseholdMember[] = rawMembers.map((m) => {
    const profile = profileMap.get(m.user_id);
    return {
      ...m,
      email: profile?.email ?? "Unknown",
      full_name: profile?.display_name ?? null,
    };
  });

  const invites = (invitesResult.data ?? []) as HouseholdInvite[];

  return {
    household,
    members,
    invites,
    currentUserId: user?.id ?? "",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export async function renameHousehold(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Name is required" };

  const { error } = await supabase
    .from("households")
    .update({ name })
    .eq("id", householdId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/household");
  return { ok: true };
}

export async function inviteMember(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required" };

  // Don't allow inviting yourself
  if (email === user.email) {
    return { ok: false, error: "You cannot invite yourself" };
  }

  const { error } = await supabase.from("household_invites").insert({
    household_id: householdId,
    invited_email: email,
    invited_by: user.id,
  });

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "This email has already been invited" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/household");
  return { ok: true };
}

export async function cancelInvite(inviteId: string): Promise<ActionState> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("household_invites")
    .delete()
    .eq("id", inviteId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/household");
  return { ok: true };
}

export async function removeMember(memberId: string): Promise<ActionState> {
  const supabase = await createClient();

  // Verify the remover is an owner
  const householdId = await getUserHouseholdId();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const { data: myMembership } = await supabase
    .from("household_members")
    .select("role")
    .eq("household_id", householdId)
    .eq("user_id", user.id)
    .single();

  if (myMembership?.role !== "owner") {
    return { ok: false, error: "Only the household owner can remove members" };
  }

  // Don't allow removing yourself
  const { data: targetMember } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("id", memberId)
    .single();

  if (targetMember?.user_id === user.id) {
    return { ok: false, error: "You cannot remove yourself" };
  }

  const { error } = await supabase
    .from("household_members")
    .delete()
    .eq("id", memberId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/household");
  return { ok: true };
}

export async function leaveHousehold(): Promise<ActionState> {
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  // Check if the user is the only member
  const { count } = await supabase
    .from("household_members")
    .select("id", { count: "exact", head: true })
    .eq("household_id", householdId);

  if ((count ?? 0) <= 1) {
    return {
      ok: false,
      error:
        "You are the only member. You cannot leave — rename your household instead.",
    };
  }

  // Remove from current household
  const { error: removeError } = await supabase
    .from("household_members")
    .delete()
    .eq("household_id", householdId)
    .eq("user_id", user.id);

  if (removeError) return { ok: false, error: removeError.message };

  // Create a new solo household
  const displayName =
    user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "My";

  const { data: newHousehold, error: createError } = await supabase
    .from("households")
    .insert({ name: `${displayName}'s Household`, created_by: user.id })
    .select("id")
    .single();

  if (createError) return { ok: false, error: createError.message };

  if (newHousehold) {
    await supabase.from("household_members").insert({
      household_id: newHousehold.id,
      user_id: user.id,
      role: "owner",
    });
  }

  revalidatePath("/dashboard/household");
  return { ok: true };
}
