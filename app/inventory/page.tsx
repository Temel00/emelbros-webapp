// app/dashboard/page.tsx
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { AuthButton } from "@/components/auth-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { hasEnvVars } from "@/lib/utils";
import { AddItemForm, UpdateItemForm, DeleteItemForm } from "./widgets";
import Link from "next/link";
import Image from "next/image";

type InventoryItem = {
  id: number;
  name: string;
  quantity?: number | null;
};

async function InventoryList() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("inventory")
    .select("*")
    .order("id", { ascending: true });

  if (error) return <div className="text-red-600">Error: {error.message}</div>;

  const items = (data || []) as InventoryItem[];

  if (items.length === 0) return <div>No inventory found.</div>;

  return (
    <div className="space-y-4">
      {/* Simple add form at the top */}
      <AddItemForm />

      {/* Render items as <p>, with update/delete forms next to each */}
      <div className="space-y-1">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            <p className="flex-1">
              #{item.id} — {item.name}
              {typeof item.quantity === "number"
                ? ` (qty: ${item.quantity})`
                : null}
            </p>
            <UpdateItemForm
              id={item.id}
              currentName={item.name}
              currentQuantity={item.quantity ?? ""}
            />
            <DeleteItemForm id={item.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <main className="min-h-screen flex flex-col items-center">
      <div className="flex-1 w-full flex flex-col items-center">
        <nav className="w-full flex justify-center border-b border-b-foreground/10 h-16">
          <div className="w-full max-w-6xl flex gap-5 justify-between items-center p-3 px-5 text-sm">
            <ThemeSwitcher />
            {!hasEnvVars ? (
              <p>Missing ENV vars</p>
            ) : (
              <Suspense>
                <AuthButton />
              </Suspense>
            )}
          </div>
        </nav>
        <div className="flex w-5/6 py-2">
          <Link
            className="border-3 border-terciary rounded-xl p-2 cursor-pointer"
            href={"/dashboard"}
          >
            <Image
              src="/back-arrow-icon.svg"
              width={24}
              height={24}
              alt="back-icon"
            />
          </Link>
        </div>
        <section className="w-full max-w-5xl p-5 space-y-6">
          <h1 className="text-2xl font-semibold">Inventory</h1>
          <Suspense fallback={<div>Loading inventory…</div>}>
            <InventoryList />
          </Suspense>
        </section>
      </div>
    </main>
  );
}
