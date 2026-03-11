"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { lbsToKg } from "@/lib/unit-helpers";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type Measurement = {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  notes: string | null;
};

export type HealthProfile = {
  height_in: number | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Profile (height for BMI calculation)
// ─────────────────────────────────────────────────────────────────────────────

export async function getHealthProfile(): Promise<HealthProfile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { height_in: null };

  const { data } = await supabase
    .from("profiles")
    .select("height_in")
    .eq("id", user.id)
    .single();

  return { height_in: data?.height_in ?? null };
}

export async function updateHealthProfile(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const feet = Number(formData.get("feet") || 0);
  const inches = Number(formData.get("inches") || 0);
  const totalInches = feet * 12 + inches;

  if (totalInches <= 0) {
    return { ok: false, error: "Height is required" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ height_in: totalInches })
    .eq("id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/health/measurements");
  revalidatePath("/dashboard/health");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Measurements CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getMeasurements(): Promise<Measurement[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const { data } = await supabase
    .from("measurements")
    .select("id, user_id, measured_at, weight_kg, systolic_bp, diastolic_bp, notes")
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .limit(20);

  return (data as Measurement[]) ?? [];
}

export async function addMeasurement(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const weightLbs = formData.get("weight_lbs");
  const systolic = formData.get("systolic_bp");
  const diastolic = formData.get("diastolic_bp");
  const notes = String(formData.get("notes") || "").trim() || null;

  const hasWeight = weightLbs && Number(weightLbs) > 0;
  const hasBp = systolic && Number(systolic) > 0 && diastolic && Number(diastolic) > 0;

  if (!hasWeight && !hasBp) {
    return { ok: false, error: "At least one measurement is required" };
  }

  // Validate BP: both or neither
  if ((systolic && Number(systolic) > 0) !== (diastolic && Number(diastolic) > 0)) {
    return { ok: false, error: "Both systolic and diastolic are required for blood pressure" };
  }

  const { error } = await supabase.from("measurements").insert({
    user_id: user.id,
    weight_kg: hasWeight ? lbsToKg(Number(weightLbs)) : null,
    systolic_bp: hasBp ? Number(systolic) : null,
    diastolic_bp: hasBp ? Number(diastolic) : null,
    notes,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/health/measurements");
  revalidatePath("/dashboard/health");
  return { ok: true };
}

export async function deleteMeasurement(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  if (!id) return { ok: false, error: "Missing measurement ID" };

  const { error } = await supabase
    .from("measurements")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/health/measurements");
  revalidatePath("/dashboard/health");
  return { ok: true };
}
