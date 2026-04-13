"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type DartsGame = {
  id: string;
  user_id: string;
  played_at: string;
  result: "win" | "loss";
  opponent_name: string | null;
  notes: string | null;
};

export type DartsSummary = {
  wins: number;
  losses: number;
  total: number;
  winPct: number;
};

export type DartsData = {
  games: DartsGame[];
  summary: DartsSummary;
};

export type HouseholdMember = {
  user_id: string;
  display_name: string | null;
  email: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────────────────────────────────────────────

export async function getHouseholdMembers(): Promise<HouseholdMember[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: myMembership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!myMembership) return [];

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id")
    .eq("household_id", myMembership.household_id)
    .neq("user_id", user.id);

  if (!members || members.length === 0) return [];

  const memberIds = members.map((m) => m.user_id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .in("id", memberIds);

  if (!profiles) return [];

  return profiles.map((p) => ({
    user_id: p.id,
    display_name: p.display_name ?? null,
    email: p.email,
  }));
}

export async function getDartsData(): Promise<DartsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const empty: DartsData = {
    games: [],
    summary: { wins: 0, losses: 0, total: 0, winPct: 0 },
  };

  if (!user) return empty;

  const { data, error } = await supabase
    .from("darts_games")
    .select("*")
    .eq("user_id", user.id)
    .order("played_at", { ascending: false });

  if (error || !data) return empty;

  const games = data as DartsGame[];
  const wins = games.filter((g) => g.result === "win").length;
  const losses = games.filter((g) => g.result === "loss").length;
  const total = wins + losses;
  const winPct = total > 0 ? Math.round((wins / total) * 100) : 0;

  return { games, summary: { wins, losses, total, winPct } };
}

// ─────────────────────────────────────────────────────────────────────────────
// Mutations
// ─────────────────────────────────────────────────────────────────────────────

export async function logDartsGame(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const result = String(formData.get("result") || "").trim();
  if (result !== "win" && result !== "loss") {
    return { ok: false, error: "Result must be win or loss" };
  }

  const opponent_name =
    String(formData.get("opponent_name") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  const { error } = await supabase.from("darts_games").insert({
    user_id: user.id,
    result,
    opponent_name,
    notes,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/hobbies");
  return { ok: true };
}

export async function deleteDartsGame(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  await supabase
    .from("darts_games")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  revalidatePath("/dashboard/hobbies");
}
