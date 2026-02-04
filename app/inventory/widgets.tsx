// app/dashboard/widgets.tsx
"use client";

import { useActionState } from "react";
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  type InventoryActionState, // whatever name you used for the state/result type
} from "./actions";

// If your exported type is ActionResult, just use that here instead:
type ActionState = InventoryActionState | { ok: boolean; error?: string };

const initialState: ActionState = { ok: true };

export function AddItemForm() {
  const [state, formAction, pending] = useActionState(
    addInventoryItem,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input
        name="name"
        placeholder="New item name"
        className="border px-2 py-1 rounded"
        required
      />
      <input
        name="quantity"
        placeholder="Qty"
        type="number"
        min={0}
        className="border px-2 py-1 rounded w-24"
      />
      <button
        type="submit"
        className="border px-3 py-1 rounded"
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
}: {
  id: number;
  currentName: string;
  currentQuantity: number | string;
}) {
  const [state, formAction, pending] = useActionState(
    updateInventoryItem,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      <input
        name="name"
        defaultValue={currentName}
        className="border px-2 py-1 rounded"
      />
      <input
        name="quantity"
        defaultValue={currentQuantity}
        type="number"
        min={0}
        className="border px-2 py-1 rounded w-20"
      />
      <button
        type="submit"
        className="border px-3 py-1 rounded"
        disabled={pending}
      >
        {pending ? "Saving…" : "Save"}
      </button>
      {!state.ok && <span className="text-red-600 text-sm">{state.error}</span>}
    </form>
  );
}

export function DeleteItemForm({ id }: { id: number }) {
  const [state, formAction, pending] = useActionState(
    deleteInventoryItem,
    initialState,
  );

  return (
    <form action={formAction} className="flex items-center gap-2">
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
