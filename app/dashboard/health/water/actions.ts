"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type WaterLog = {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
};

export async function getWaterLogs(date?: string): Promise<WaterLog[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return [];

  const target = date ?? new Date().toISOString().split("T")[0];

  const { data } = await supabase
    .from("water_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", `${target}T00:00:00`)
    .lte("logged_at", `${target}T23:59:59`)
    .order("logged_at", { ascending: false });

  return (data as WaterLog[]) ?? [];
}

export async function deleteWaterLog(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const id = String(formData.get("id"));

  if (!id) return { ok: false, error: "Missing log ID" };

  const { error } = await supabase.from("water_logs").delete().eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/health/water");
  revalidatePath("/dashboard/health");
  return { ok: true };
}
