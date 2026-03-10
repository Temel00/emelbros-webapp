"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUserHouseholdId } from "@/lib/supabase/household";
import type { UUID } from "crypto";

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type Tool = {
  id: UUID;
  name: string;
  location: string | null;
};

export type InstructionTool = {
  id: UUID;
  tool_id: UUID;
  tool: Tool;
};

export type Instruction = {
  id: UUID;
  step_number: number;
  text: string;
  detail: string | null;
  instruction_tools: InstructionTool[];
};

export type RecipeIngredient = {
  id: UUID;
  amount: number | null;
  unit: string | null;
  first_used_step: number | null;
  used_in_steps: number[];
  note: string | null;
  position: number | null;
  inventory: {
    id: UUID;
    name: string;
    on_hand_qty: number;
    unit: string | null;
  };
};

export type InventoryItem = {
  id: UUID;
  name: string;
  unit: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// INGREDIENT ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function addIngredient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const recipeId = String(formData.get("recipe_id") || "").trim();
  const inventoryId = String(formData.get("inventory_id") || "").trim();
  const amount = formData.get("amount") ? Number(formData.get("amount")) : null;
  const unit = String(formData.get("unit") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  const firstUsedStep = formData.get("first_used_step")
    ? Number(formData.get("first_used_step"))
    : null;
  const usedInStepsRaw = String(formData.get("used_in_steps") || "").trim();
  const usedInSteps: number[] = usedInStepsRaw
    ? JSON.parse(usedInStepsRaw)
    : [];

  if (!recipeId) {
    return { ok: false, error: "Recipe ID is required" };
  }
  if (!inventoryId) {
    return { ok: false, error: "Please select an ingredient from inventory" };
  }

  // Get the next position
  const { data: existing } = await supabase
    .from("recipe_ingredients")
    .select("position")
    .eq("recipe_id", recipeId)
    .order("position", { ascending: false })
    .limit(1);

  const nextPosition =
    existing && existing.length > 0 && existing[0].position != null
      ? existing[0].position + 1
      : 1;

  const { error } = await supabase.from("recipe_ingredients").insert({
    recipe_id: recipeId,
    inventory_id: inventoryId,
    amount,
    unit,
    note,
    first_used_step: firstUsedStep,
    used_in_steps: usedInSteps,
    position: nextPosition,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/food/recipes/${recipeId}`);
  return { ok: true };
}

export async function updateIngredient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const recipeId = String(formData.get("recipe_id") || "").trim();

  if (!id) {
    return { ok: false, error: "Ingredient ID is required" };
  }

  const updates: Record<string, unknown> = {};

  if (formData.has("amount")) {
    const val = formData.get("amount");
    updates.amount = val ? Number(val) : null;
  }
  if (formData.has("unit")) {
    updates.unit = String(formData.get("unit") || "").trim() || null;
  }
  if (formData.has("note")) {
    updates.note = String(formData.get("note") || "").trim() || null;
  }
  if (formData.has("first_used_step")) {
    const val = formData.get("first_used_step");
    updates.first_used_step = val ? Number(val) : null;
  }
  if (formData.has("used_in_steps")) {
    const raw = String(formData.get("used_in_steps") || "").trim();
    updates.used_in_steps = raw ? JSON.parse(raw) : [];
  }

  if (Object.keys(updates).length === 0) {
    return { ok: false, error: "No fields to update" };
  }

  const { error } = await supabase
    .from("recipe_ingredients")
    .update(updates)
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/food/recipes/${recipeId}`);
  return { ok: true };
}

export async function deleteIngredient(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const recipeId = String(formData.get("recipe_id") || "").trim();

  if (!id) {
    return { ok: false, error: "Ingredient ID is required" };
  }

  const { error } = await supabase
    .from("recipe_ingredients")
    .delete()
    .eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/food/recipes/${recipeId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTION ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function addInstruction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const recipeId = String(formData.get("recipe_id") || "").trim();
  const text = String(formData.get("text") || "").trim();
  const toolIdsRaw = String(formData.get("tool_ids") || "").trim();
  const toolIds: string[] = toolIdsRaw ? JSON.parse(toolIdsRaw) : [];

  if (!recipeId) {
    return { ok: false, error: "Recipe ID is required" };
  }
  if (!text) {
    return { ok: false, error: "Instruction text is required" };
  }

  // Get the next step number
  const { data: existing } = await supabase
    .from("instructions")
    .select("step_number")
    .eq("recipe_id", recipeId)
    .order("step_number", { ascending: false })
    .limit(1);

  const nextStep =
    existing && existing.length > 0 ? existing[0].step_number + 1 : 1;

  const { data: newInstruction, error } = await supabase
    .from("instructions")
    .insert({
      recipe_id: recipeId,
      step_number: nextStep,
      text,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: error.message };
  }

  // Associate tools with the new instruction
  if (toolIds.length > 0 && newInstruction) {
    const rows = toolIds.map((toolId) => ({
      instruction_id: newInstruction.id,
      tool_id: toolId,
    }));
    await supabase.from("instruction_tools").insert(rows);
  }

  revalidatePath(`/dashboard/food/recipes/${recipeId}`);
  return { ok: true };
}

export async function updateInstruction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const recipeId = String(formData.get("recipe_id") || "").trim();

  if (!id) {
    return { ok: false, error: "Instruction ID is required" };
  }

  const updates: Record<string, unknown> = {};

  if (formData.has("text")) {
    const val = String(formData.get("text") || "").trim();
    if (!val) {
      return { ok: false, error: "Instruction text cannot be empty" };
    }
    updates.text = val;
  }

  if (Object.keys(updates).length === 0 && !formData.has("tool_ids")) {
    return { ok: false, error: "No fields to update" };
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from("instructions")
      .update(updates)
      .eq("id", id);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  // Update tool associations if provided
  if (formData.has("tool_ids")) {
    const toolIdsRaw = String(formData.get("tool_ids") || "").trim();
    const toolIds: string[] = toolIdsRaw ? JSON.parse(toolIdsRaw) : [];

    // Delete existing tools for this instruction
    await supabase
      .from("instruction_tools")
      .delete()
      .eq("instruction_id", id);

    // Insert new tool associations
    if (toolIds.length > 0) {
      const rows = toolIds.map((toolId) => ({
        instruction_id: id,
        tool_id: toolId,
      }));
      const { error: toolError } = await supabase
        .from("instruction_tools")
        .insert(rows);
      if (toolError) {
        return { ok: false, error: toolError.message };
      }
    }
  }

  revalidatePath(`/dashboard/food/recipes/${recipeId}`);
  return { ok: true };
}

export async function deleteInstruction(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const recipeId = String(formData.get("recipe_id") || "").trim();

  if (!id) {
    return { ok: false, error: "Instruction ID is required" };
  }

  // Get the step number of the instruction being deleted
  const { data: toDelete } = await supabase
    .from("instructions")
    .select("step_number")
    .eq("id", id)
    .single();

  if (!toDelete) {
    return { ok: false, error: "Instruction not found" };
  }

  // Delete the instruction
  const { error: deleteError } = await supabase
    .from("instructions")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  // Renumber remaining instructions that come after the deleted one
  const { data: remaining } = await supabase
    .from("instructions")
    .select("id, step_number")
    .eq("recipe_id", recipeId)
    .gt("step_number", toDelete.step_number)
    .order("step_number", { ascending: true });

  if (remaining && remaining.length > 0) {
    for (const instruction of remaining) {
      await supabase
        .from("instructions")
        .update({ step_number: instruction.step_number - 1 })
        .eq("id", instruction.id);
    }
  }

  revalidatePath(`/dashboard/food/recipes/${recipeId}`);
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL ACTIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createToolInline(
  name: string,
): Promise<{ ok: boolean; error?: string; tool?: Tool }> {
  const supabase = await createClient();
  const householdId = await getUserHouseholdId();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Name is required" };

  const { data, error } = await supabase
    .from("tools")
    .insert({ name: trimmed, household_id: householdId })
    .select("id, name, location")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "A tool with that name already exists" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/food/tools");
  return { ok: true, tool: data as Tool };
}

export async function reorderInstructions(
  recipeId: string,
  orderedIds: string[],
): Promise<ActionState> {
  const supabase = await createClient();

  if (!recipeId) {
    return { ok: false, error: "Recipe ID is required" };
  }
  if (!orderedIds || orderedIds.length === 0) {
    return { ok: false, error: "No instructions to reorder" };
  }

  // Update each instruction with its new step number
  for (let i = 0; i < orderedIds.length; i++) {
    const { error } = await supabase
      .from("instructions")
      .update({ step_number: i + 1 })
      .eq("id", orderedIds[i]);

    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath(`/dashboard/food/recipes/${recipeId}`);
  return { ok: true };
}
