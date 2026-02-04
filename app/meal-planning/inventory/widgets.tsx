"use client";

import { useActionState } from "react";
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  type InventoryActionState, // whatever name you used for the state/result type
} from "./actions";
import { UUID } from "crypto";
import { UnitSwitcher } from "@/components/unit-switcher";

// If your exported type is ActionResult, just use that here instead:
type ActionState = InventoryActionState | { ok: boolean; error?: string };

const initialState: ActionState = { ok: true };

export function AddItemForm() {
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
}: {
  id: UUID;
  currentName: string;
  currentQuantity: number | string;
}) {
  const [state, formAction, pending] = useActionState(
    updateInventoryItem,
    initialState,
  );

  console.log(id);

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
        step={0.1}
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

export function DeleteItemForm({ id }: { id: UUID }) {
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
