"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type Exercise = {
  id: string;
  user_id: string;
  name: string;
  duration_minutes: number | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  notes: string | null;
  performed_at: string;
};

export async function getExercises(date?: string): Promise<Exercise[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const target = date ?? new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("exercises")
    .select("*")
    .eq("user_id", user.id)
    .gte("performed_at", `${target}T00:00:00`)
    .lte("performed_at", `${target}T23:59:59`)
    .order("performed_at", { ascending: false });

  return (data as Exercise[]) ?? [];
}

export async function addExercise(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Exercise name is required" };

  const duration = formData.get("duration_minutes");
  const sets = formData.get("sets");
  const reps = formData.get("reps");
  const weight = formData.get("weight_kg");
  const notes = String(formData.get("notes") || "").trim() || null;

  const { error } = await supabase.from("exercises").insert({
    user_id: user.id,
    name,
    duration_minutes: duration ? Number(duration) : null,
    sets: sets ? Number(sets) : null,
    reps: reps ? Number(reps) : null,
    weight_kg: weight ? Number(weight) : null,
    notes,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/health/exercises");
  revalidatePath("/dashboard/health");
  return { ok: true };
}

export async function deleteExercise(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  if (!id) return { ok: false, error: "Missing exercise ID" };

  const { error } = await supabase.from("exercises").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/health/exercises");
  revalidatePath("/dashboard/health");
  return { ok: true };
}
