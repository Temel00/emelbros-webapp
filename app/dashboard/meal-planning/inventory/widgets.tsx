"use client";

import { useActionState, useState, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  type InventoryActionState,
} from "./actions";
import { UUID } from "crypto";
import { UnitSwitcher } from "@/components/unit-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EditGear } from "@/components/ui/edit-gear";
import { Cancel } from "@/components/ui/cancel";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronLeft, ChevronRight } from "lucide-react";

// If your exported type is ActionResult, just use that here instead:
type ActionState = InventoryActionState | { ok: boolean; error?: string };

const initialState: ActionState = { ok: true };

function AddItemForm() {
  const [state, formAction, pending] = useActionState(
    addInventoryItem,
    initialState,
  );

  return (
    <form
      action={formAction}
      className="flex items-end justify-start p-4 gap-2"
    >
      <div className="flex flex-col">
        <label htmlFor="name">Name</label>
        <input
          id="name"
          name="name"
          placeholder="New item name"
          className="border px-2 py-1 h-10 rounded"
          required
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="quantity">Qty</label>
        <input
          id="quantity"
          name="quantity"
          placeholder="Qty"
          type="number"
          step={0.1}
          min={0}
          className="border px-2 py-1 h-10 rounded w-24"
        />
      </div>
      <div className="flex flex-col">
        <label>Unit</label>
        <UnitSwitcher currentVal="g" />
      </div>
      <button
        type="submit"
        className="border px-3 py-1 mx-8 self-center rounded"
        disabled={pending}
      >
        {pending ? "Adding…" : "Add"}
      </button>
      {!state.ok && <span className="text-red-600 text-sm">{state.error}</span>}
    </form>
  );
}

export function UpdateItemForm({
  id,
  currentName,
  currentQuantity,
  currentUnit,
}: {
  id: UUID;
  currentName: string;
  currentQuantity: number | string;
  currentUnit: string;
}) {
  const [state, formAction, pending] = useActionState(
    updateInventoryItem,
    initialState,
  );

  const [showUpdateInventory, setShowUpdateInventory] = useState(false);
  const [wasPending, setWasPending] = useState(false);

  // Toggle back to display mode after successful save
  useEffect(() => {
    if (pending) {
      // Track that we started a save operation
      setWasPending(true);
    } else if (wasPending && state.ok) {
      // We just finished saving and it was successful
      setShowUpdateInventory(false);
      setWasPending(false);
    }
  }, [pending, state.ok, wasPending]);

  return (
    <div key={id} className="flex h-10 items-center gap-3">
      {/* Toggle editting for each item */}
      {!showUpdateInventory ? (
        // Unedittable Item
        <div className="w-full flex flex-end">
          <p className="flex-1">
            {currentName}
            {typeof currentQuantity === "number"
              ? `: ${currentQuantity} ${currentUnit}`
              : null}
          </p>
          <EditGear
            onClick={() =>
              setShowUpdateInventory(
                (prevShowUpdateInventory) => !prevShowUpdateInventory,
              )
            }
            className="w-5 h-5 hover:text-primary"
          />
        </div>
      ) : (
        // Edittable Item
        <div className="w-full flex items-center justify-between">
          <form action={formAction} className="flex items-end gap-2">
            <div className="flex mr-4">
              <input type="hidden" name="id" value={id} />
              <button
                type="submit"
                className="border px-3 py-1 rounded hover:bg-green-200"
                disabled={pending}
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
            <div className="h-12 flex flex-col">
              <label className="text-xs text-foreground/50" htmlFor="name">
                Name
              </label>
              <input
                id="name"
                name="name"
                defaultValue={currentName}
                className="border px-2 py-1 rounded"
              />
            </div>
            <div className="h-12 flex flex-col">
              <label className="text-xs text-foreground/50" htmlFor="name">
                Qty
              </label>
              <input
                name="quantity"
                defaultValue={currentQuantity}
                type="number"
                step={0.1}
                min={0}
                className="border px-2 py-1 rounded w-20"
              />
            </div>
            <div className="h-12 flex flex-col">
              <label className="text-xs text-foreground/50" htmlFor="name">
                Unit
              </label>
              <UnitSwitcher currentVal={currentUnit} />
            </div>
            {!state.ok && (
              <span className="text-red-600 text-sm">{state.error}</span>
            )}
          </form>
          <div className="flex items-center gap-6">
            <DeleteItemForm id={id} />
            <Cancel
              onClick={() =>
                setShowUpdateInventory(
                  (prevShowUpdateInventory) => !prevShowUpdateInventory,
                )
              }
              className="w-5 h-5 hover:text-primary"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function DeleteItemForm({ id }: { id: UUID }) {
  const [state, formAction, pending] = useActionState(
    deleteInventoryItem,
    initialState,
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this item?",
    );
    if (!confirmed) {
      event.preventDefault(); // This stops the formAction from running
    }
  };

  return (
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="text-red-600 border px-3 py-1 rounded"
        disabled={pending}
      >
        {pending ? "Deleting…" : "Delete"}
      </button>
      {!state.ok && <span className="text-red-600 text-sm">{state.error}</span>}
    </form>
  );
}

export function InventoryFormToggle() {
  const [isFormVisible, setIsFormVisible] = useState(false);

  return (
    <div className="space-y-4">
      {isFormVisible ? (
        <div>
          <Button onClick={() => setIsFormVisible(false)}>Close</Button>
          <AddItemForm />
        </div>
      ) : (
        <Button onClick={() => setIsFormVisible(true)}>Add items</Button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search and Filter Components
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "weight", label: "Weight" },
  { value: "volume", label: "Volume" },
  { value: "count", label: "Count" },
] as const;

export function InventorySearchFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const category = searchParams.get("category") ?? "all";

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue) {
        params.set("q", searchValue);
      } else {
        params.delete("q");
      }
      params.delete("page"); // Reset to page 1
      router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchValue, searchParams, router, pathname]);

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    params.delete("page"); // Reset to page 1
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-4 items-center">
      <Input
        placeholder="Search by name..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="max-w-sm"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            {CATEGORIES.find((c) => c.value === category)?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={category}
            onValueChange={handleCategoryChange}
          >
            {CATEGORIES.map((cat) => (
              <DropdownMenuRadioItem key={cat.value} value={cat.value}>
                {cat.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

type PaginationControlsProps = {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
};

export function PaginationControls({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
}: PaginationControlsProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (page > 1) {
      params.set("page", page.toString());
    } else {
      params.delete("page");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  if (totalItems === 0) return null;

  return (
    <div className="flex items-center justify-between py-4">
      <p className="text-sm text-muted-foreground">
        Showing {startItem}-{endItem} of {totalItems} items
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>
        <span className="text-sm">
          Page {currentPage} of {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
