"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { HealthProfile } from "./measurements/actions";

export type ActionState = {
  ok: boolean;
  error?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type WaterLog = {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
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

export type Measurement = {
  id: string;
  user_id: string;
  measured_at: string;
  weight_kg: number | null;
  systolic_bp: number | null;
  diastolic_bp: number | null;
  notes: string | null;
};

export type MeasurementTrend = {
  latest: Measurement | null;
  previous: Measurement | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Dashboard data fetching
// ─────────────────────────────────────────────────────────────────────────────

export type HealthDashboardData = {
  todayWaterMl: number;
  todayExercises: Exercise[];
  measurementTrend: MeasurementTrend;
  healthProfile: HealthProfile;
};

export async function getHealthDashboard(): Promise<HealthDashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const emptyProfile: HealthProfile = { height_in: null };

  if (!user)
    return {
      todayWaterMl: 0,
      todayExercises: [],
      measurementTrend: { latest: null, previous: null },
      healthProfile: emptyProfile,
    };

  const today = new Date().toISOString().split("T")[0];

  const [waterRes, exerciseRes, measurementRes, profileRes] =
    await Promise.all([
      supabase
        .from("water_logs")
        .select("amount_ml")
        .eq("user_id", user.id)
        .gte("logged_at", `${today}T00:00:00`)
        .lte("logged_at", `${today}T23:59:59`),
      supabase
        .from("exercises")
        .select("*")
        .eq("user_id", user.id)
        .gte("performed_at", `${today}T00:00:00`)
        .lte("performed_at", `${today}T23:59:59`)
        .order("performed_at", { ascending: false }),
      supabase
        .from("measurements")
        .select(
          "id, user_id, measured_at, weight_kg, systolic_bp, diastolic_bp, notes",
        )
        .eq("user_id", user.id)
        .order("measured_at", { ascending: false })
        .limit(2),
      supabase
        .from("profiles")
        .select("height_in")
        .eq("id", user.id)
        .single(),
    ]);

  const todayWaterMl = (waterRes.data ?? []).reduce(
    (sum, row) => sum + row.amount_ml,
    0,
  );

  const measurements = (measurementRes.data as Measurement[]) ?? [];

  return {
    todayWaterMl,
    todayExercises: (exerciseRes.data as Exercise[]) ?? [],
    measurementTrend: {
      latest: measurements[0] ?? null,
      previous: measurements[1] ?? null,
    },
    healthProfile: {
      height_in: profileRes.data?.height_in ?? null,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick-add water
// ─────────────────────────────────────────────────────────────────────────────

export async function addWater(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { ok: false, error: "Not authenticated" };

  const amount = Number(formData.get("amount_ml"));
  if (!amount || amount <= 0) {
    return { ok: false, error: "Amount must be greater than 0" };
  }

  const { error } = await supabase.from("water_logs").insert({
    user_id: user.id,
    amount_ml: amount,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/health");
  return { ok: true };
}
