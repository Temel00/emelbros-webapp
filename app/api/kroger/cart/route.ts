import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const TOKEN_URL = "https://api.kroger.com/v1/connect/oauth2/token";
const PRODUCTS_URL = "https://api.kroger.com/v1/products";
const CART_URL = "https://api.kroger.com/v1/cart/add";

type ShoppingItem = {
  name: string;
  needed_qty: number;
  unit: string;
  inventory_id?: string | null;
};

async function getClientCredentialsToken(): Promise<string | null> {
  const clientId = process.env.KROGER_CLIENT_ID;
  const clientSecret = process.env.KROGER_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "product.compact",
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return (data.access_token as string) ?? null;
}

async function searchProductUpc(
  name: string,
  clientToken: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    "filter.term": name,
    "filter.limit": "1",
  });

  const locationId = process.env.KROGER_LOCATION_ID;
  if (locationId) params.set("filter.locationId", locationId);

  const res = await fetch(`${PRODUCTS_URL}?${params}`, {
    headers: { Authorization: `Bearer ${clientToken}` },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return (data.data?.[0]?.upc as string) ?? null;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("kroger_access_token")?.value;

  if (!accessToken) {
    return NextResponse.json(
      { error: "not_authenticated", requiresAuth: true },
      { status: 401 },
    );
  }

  const body = await request.json();
  const items: ShoppingItem[] = body.items ?? [];

  if (items.length === 0) {
    return NextResponse.json({ error: "No items provided" }, { status: 400 });
  }

  // Look up saved UPCs from vendor_products for Kroger
  const supabase = await createClient();

  // Find the Kroger vendor
  const { data: krogerVendor } = await supabase
    .from("vendors")
    .select("id")
    .eq("slug", "kroger")
    .single();

  // Build a map of inventory_id → saved UPC
  const savedUpcMap = new Map<string, string>();
  if (krogerVendor) {
    const inventoryIds = items
      .map((i) => i.inventory_id)
      .filter((id): id is string => !!id);

    if (inventoryIds.length > 0) {
      const { data: vendorProducts } = await supabase
        .from("vendor_products")
        .select("inventory_id, upc")
        .eq("vendor_id", krogerVendor.id)
        .in("inventory_id", inventoryIds)
        .not("upc", "is", null);

      for (const vp of vendorProducts ?? []) {
        if (vp.upc) savedUpcMap.set(vp.inventory_id, vp.upc);
      }
    }
  }

  // Get client credentials token for searching items without saved UPCs
  const clientToken = await getClientCredentialsToken();
  if (!clientToken) {
    return NextResponse.json(
      { error: "Failed to connect to Kroger product catalog" },
      { status: 500 },
    );
  }

  // Resolve UPCs: use saved UPC if available, otherwise search
  const results = await Promise.all(
    items.map(async (item) => {
      // Check for saved UPC first
      if (item.inventory_id && savedUpcMap.has(item.inventory_id)) {
        return { item, upc: savedUpcMap.get(item.inventory_id)!, source: "saved" as const };
      }
      // Fall back to search
      const upc = await searchProductUpc(item.name, clientToken);
      return { item, upc, source: "search" as const };
    }),
  );

  const cartItems = results
    .filter((r) => r.upc !== null)
    .map((r) => ({
      upc: r.upc!,
      quantity: Math.max(1, Math.round(r.item.needed_qty)),
    }));

  const notFound = results
    .filter((r) => r.upc === null)
    .map((r) => r.item.name);

  const savedCount = results.filter((r) => r.source === "saved").length;

  if (cartItems.length === 0) {
    return NextResponse.json(
      { error: "No matching products found on Kroger", notFound },
      { status: 404 },
    );
  }

  // Add to cart
  const cartRes = await fetch(CART_URL, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ items: cartItems }),
  });

  if (cartRes.status === 401) {
    // Token expired
    return NextResponse.json(
      { error: "not_authenticated", requiresAuth: true },
      { status: 401 },
    );
  }

  if (!cartRes.ok) {
    const errText = await cartRes.text();
    console.error("Kroger cart error:", errText);
    return NextResponse.json(
      { error: "Failed to add items to Kroger cart" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    added: cartItems.length,
    notFound,
    savedUpcs: savedCount,
  });
}

// Check if the user has an active Kroger session
export async function GET() {
  const cookieStore = await cookies();
  const hasToken = !!cookieStore.get("kroger_access_token")?.value;
  return NextResponse.json({ connected: hasToken });
}
