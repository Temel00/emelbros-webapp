"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type InventoryActionState = {
  ok: boolean;
  error?: string;
};

type InventoryItem = {
  id: number;
  name: string;
  quantity?: number | null;
};

export async function addInventoryItem(
  _prevState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  const quantityRaw = formData.get("quantity");
  const quantity =
    quantityRaw === null || quantityRaw === "" ? null : Number(quantityRaw);

  if (!name) {
    return { ok: false, error: "Name is required" };
  }
  if (quantity !== null && (Number.isNaN(quantity) || quantity < 0)) {
    return { ok: false, error: "Quantity must be a non-negative number" };
    // If you want to allow null, remove the check for < 0.
  }

  const { error } = await supabase
    .from("inventory")
    .insert([{ name, quantity }]);

  if (error) {
    return { ok: false, error: error.message };
  }

  // Make sure the dashboard re-renders with fresh data.
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Update an inventory item.
 * Expects form fields: id (required), name (optional), quantity (optional)
 */
export async function updateInventoryItem(
  _prevState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  if (!id || Number.isNaN(id)) {
    return { ok: false, error: "Valid id is required" };
  }

  const next: Partial<InventoryItem> = {};
  if (formData.has("name")) {
    next.name = String(formData.get("name") || "").trim();
    if (!next.name) return { ok: false, error: "Name cannot be empty" };
  }
  if (formData.has("quantity")) {
    const qRaw = formData.get("quantity");
    const q = qRaw === null || qRaw === "" ? null : Number(qRaw);
    if (q !== null && (Number.isNaN(q) || q < 0)) {
      return { ok: false, error: "Quantity must be a non-negative number" };
    }
    next.quantity = q;
  }

  if (Object.keys(next).length === 0) {
    return { ok: false, error: "No fields to update" };
  }

  const { error } = await supabase.from("inventory").update(next).eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Delete an inventory item.
 * Expects form field: id (required)
 */
export async function deleteInventoryItem(
  _prevState: InventoryActionState,
  formData: FormData,
): Promise<InventoryActionState> {
  const supabase = await createClient();

  const id = Number(formData.get("id"));
  if (!id || Number.isNaN(id)) {
    return { ok: false, error: "Valid id is required" };
  }

  const { error } = await supabase.from("inventory").delete().eq("id", id);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard");
  return { ok: true };
}
