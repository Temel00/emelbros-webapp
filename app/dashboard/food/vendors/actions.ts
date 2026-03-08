"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";
import type { UUID } from "crypto";

export type VendorActionState = {
  ok: boolean;
  error?: string;
};

export type Vendor = {
  id: UUID;
  name: string;
  slug: string;
  created_at: string;
};

export type VendorProduct = {
  id: UUID;
  vendor_id: UUID;
  inventory_id: UUID;
  upc: string | null;
  product_name: string | null;
  pack_size: number | null;
  pack_unit: string | null;
  notes: string | null;
  created_at: string;
};

export type VendorProductWithInventory = VendorProduct & {
  inventory: { id: UUID; name: string; unit: string } | null;
};

export type VendorFetchResult = {
  vendors: Vendor[];
};

export type VendorProductFetchResult = {
  items: VendorProductWithInventory[];
  hasMore: boolean;
  totalItems: number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Vendors CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchVendors(): Promise<VendorFetchResult> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("vendors")
    .select("*")
    .order("name", { ascending: true });

  if (error) return { vendors: [] };
  return { vendors: (data ?? []) as Vendor[] };
}

export async function addVendor(
  _prevState: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  const supabase = await createClient();

  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Name is required" };

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  if (!slug) return { ok: false, error: "Invalid vendor name" };

  const { error } = await supabase.from("vendors").insert({ name, slug });

  if (error) {
    if ((error as PostgrestError).code === "23505") {
      return { ok: false, error: "A vendor with that name already exists" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/food/vendors");
  return { ok: true };
}

export async function updateVendor(
  _prevState: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  const supabase = await createClient();

  const id = formData.get("id");
  if (!id) return { ok: false, error: "Vendor ID is required" };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { ok: false, error: "Name cannot be empty" };

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  const { error } = await supabase
    .from("vendors")
    .update({ name, slug })
    .eq("id", id);

  if (error) {
    if ((error as PostgrestError).code === "23505") {
      return { ok: false, error: "A vendor with that name already exists" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/food/vendors");
  return { ok: true };
}

export async function deleteVendor(
  _prevState: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  const supabase = await createClient();

  const id = formData.get("id");
  if (!id) return { ok: false, error: "Vendor ID is required" };

  const { error } = await supabase.from("vendors").delete().eq("id", id);

  if (error) {
    if ((error as PostgrestError).code === "23503") {
      return {
        ok: false,
        error: "This vendor has product mappings. Remove them first.",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/food/vendors");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Products CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchVendorProducts(
  vendorId: string,
  loadNumber: number,
  search: string,
  itemsPerLoad: number,
): Promise<VendorProductFetchResult> {
  const supabase = await createClient();

  let query = supabase
    .from("vendor_products")
    .select("*, inventory:inventory(id, name, unit)", { count: "exact" })
    .eq("vendor_id", vendorId);

  if (search) {
    query = query.or(
      `product_name.ilike.%${search}%,inventory.name.ilike.%${search}%`,
    );
  }

  const from = (loadNumber - 1) * itemsPerLoad;
  const to = from + itemsPerLoad - 1;

  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) return { items: [], hasMore: false, totalItems: 0 };

  const items = (data ?? []) as unknown as VendorProductWithInventory[];
  const totalItems = count ?? 0;

  return {
    items,
    hasMore: from + items.length < totalItems,
    totalItems,
  };
}

export async function upsertVendorProduct(
  _prevState: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  const supabase = await createClient();

  const id = String(formData.get("id") || "").trim();
  const vendorId = String(formData.get("vendor_id") || "").trim();
  const inventoryId = String(formData.get("inventory_id") || "").trim();
  const upc = String(formData.get("upc") || "").trim() || null;
  const productName = String(formData.get("product_name") || "").trim() || null;
  const packSizeRaw = formData.get("pack_size");
  const packSize = packSizeRaw ? Number(packSizeRaw) : null;
  const packUnit = String(formData.get("pack_unit") || "").trim() || null;
  const notes = String(formData.get("notes") || "").trim() || null;

  if (!vendorId) return { ok: false, error: "Vendor is required" };
  if (!inventoryId) return { ok: false, error: "Inventory item is required" };

  if (id) {
    // Update existing
    const { error } = await supabase
      .from("vendor_products")
      .update({
        upc,
        product_name: productName,
        pack_size: packSize,
        pack_unit: packUnit,
        notes,
      })
      .eq("id", id);

    if (error) return { ok: false, error: error.message };
  } else {
    // Insert new
    const { error } = await supabase.from("vendor_products").insert({
      vendor_id: vendorId,
      inventory_id: inventoryId,
      upc,
      product_name: productName,
      pack_size: packSize,
      pack_unit: packUnit,
      notes,
    });

    if (error) {
      if ((error as PostgrestError).code === "23505") {
        return {
          ok: false,
          error: "This item already has a mapping for this vendor",
        };
      }
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/dashboard/food/vendors");
  return { ok: true };
}

export async function deleteVendorProduct(
  _prevState: VendorActionState,
  formData: FormData,
): Promise<VendorActionState> {
  const supabase = await createClient();

  const id = formData.get("id");
  if (!id) return { ok: false, error: "Product mapping ID is required" };

  const { error } = await supabase
    .from("vendor_products")
    .delete()
    .eq("id", id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/food/vendors");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Fetch vendor products for a specific inventory item (used in inventory edit)
// ─────────────────────────────────────────────────────────────────────────────

export type VendorProductForItem = VendorProduct & {
  vendor: { id: UUID; name: string; slug: string } | null;
};

export async function fetchVendorProductsForItem(
  inventoryId: string,
): Promise<VendorProductForItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_products")
    .select("*, vendor:vendors(id, name, slug)")
    .eq("inventory_id", inventoryId)
    .order("created_at", { ascending: true });

  if (error) return [];
  return (data ?? []) as unknown as VendorProductForItem[];
}
