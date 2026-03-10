"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserHouseholdId } from "@/lib/supabase/household";
import type { PostgrestError } from "@supabase/supabase-js";
import type { UUID } from "crypto";

export type ToolActionState = {
  ok: boolean;
  error?: string;
};

export type Tool = {
  id: UUID;
  name: string;
  location: string | null;
};

export type ToolFetchResult = {
  items: Tool[];
  hasMore: boolean;
  totalItems: number;
};

export async function fetchTools(
  loadNumber: number,
  search: string,
  itemsPerLoad: number,
): Promise<ToolFetchResult> {
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  let query = supabase.from("tools").select("*", { count: "exact" }).eq("household_id", householdId);

  if (search) {
    query = query.ilike("name", `%${search}%`);
  }

  const from = (loadNumber - 1) * itemsPerLoad;
  const to = from + itemsPerLoad - 1;

  const { data, error, count } = await query
    .order("name", { ascending: true })
    .range(from, to);

  if (error) {
    return { items: [], hasMore: false, totalItems: 0 };
  }

  const items = (data || []) as Tool[];
  const totalItems = count ?? 0;

  return {
    items,
    hasMore: from + items.length < totalItems,
    totalItems,
  };
}

export async function addTool(
  _prevState: ToolActionState,
  formData: FormData,
): Promise<ToolActionState> {
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();

  const name = String(formData.get("name") || "").trim();
  const location = String(formData.get("location") || "").trim() || null;

  if (!name) {
    return { ok: false, error: "Name is required" };
  }

  const { count: nameCount, error: nameCheckError } = await supabase
    .from("tools")
    .select("id", { count: "exact", head: true })
    .ilike("name", name)
    .eq("household_id", householdId);

  if (nameCheckError) {
    return {
      ok: false,
      error: `Couldn't verify uniqueness: ${nameCheckError.message}`,
    };
  }
  if ((nameCount ?? 0) > 0) {
    return { ok: false, error: "A tool with that name already exists" };
  }

  const { error: insertError } = await supabase
    .from("tools")
    .insert({ name, location, household_id: householdId });

  if (insertError) {
    if ((insertError as PostgrestError).code === "23505") {
      return { ok: false, error: "A tool with that name already exists" };
    }
    return { ok: false, error: insertError.message };
  }

  revalidatePath("/dashboard/food/tools");
  return { ok: true };
}

export async function updateTool(
  _prevState: ToolActionState,
  formData: FormData,
): Promise<ToolActionState> {
  const supabase = await createClient();

  const id = formData.get("id");
  if (!id) {
    return { ok: false, error: "Tool ID is required" };
  }

  const next: Partial<Tool> = {};
  if (formData.has("name")) {
    next.name = String(formData.get("name") || "").trim();
    if (!next.name) return { ok: false, error: "Name cannot be empty" };
  }
  if (formData.has("location")) {
    const loc = String(formData.get("location") || "").trim();
    next.location = loc || null;
  }

  if (Object.keys(next).length === 0) {
    return { ok: false, error: "No fields to update" };
  }

  const { error } = await supabase.from("tools").update(next).eq("id", id);

  if (error) {
    if ((error as PostgrestError).code === "23505") {
      return { ok: false, error: "A tool with that name already exists" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/food/tools");
  return { ok: true };
}

export async function deleteTool(
  _prevState: ToolActionState,
  formData: FormData,
): Promise<ToolActionState> {
  const supabase = await createClient();

  const id = formData.get("id");
  if (!id) {
    return { ok: false, error: "Tool ID is required" };
  }

  const { error } = await supabase.from("tools").delete().eq("id", id);

  if (error) {
    if ((error as PostgrestError).code === "23503") {
      return {
        ok: false,
        error:
          "This tool is used in recipe instructions. Remove it from instructions first.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/food/tools");
  return { ok: true };
}
