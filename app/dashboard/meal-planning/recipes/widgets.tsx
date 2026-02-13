"use client";

import { useActionState, useState } from "react";
import { addRecipe, type RecipeActionState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X } from "lucide-react";

const initialState: RecipeActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────────────────────

function AddRecipeForm() {
  const [state, formAction, pending] = useActionState(addRecipe, initialState);

  return (
    <form
      action={formAction}
      className="flex items-end justify-start p-4 gap-2"
    >
      <div className="flex flex-col">
        <label htmlFor="recipe-name">Name</label>
        <Input
          id="recipe-name"
          name="name"
          placeholder="Recipe name"
          required
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="prep-minutes">Prep (min)</label>
        <Input
          id="prep-minutes"
          name="prep_minutes"
          placeholder="0"
          type="number"
          min={0}
          className="w-24"
          required
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="cook-minutes">Cook (min)</label>
        <Input
          id="cook-minutes"
          name="cook_minutes"
          placeholder="0"
          type="number"
          min={0}
          className="w-24"
          required
        />
      </div>
      <Button type="submit" className="mx-8 self-center" disabled={pending}>
        <Plus className="w-4 h-4" />
        {pending ? "Adding..." : "Add"}
      </Button>
      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function RecipeFormToggle() {
  const [isFormVisible, setIsFormVisible] = useState(false);

  return (
    <div className="space-y-4">
      {isFormVisible ? (
        <div>
          <Button onClick={() => setIsFormVisible(false)}>
            Close
            <X className="w-4 h-4" />
          </Button>
          <AddRecipeForm />
        </div>
      ) : (
        <Button onClick={() => setIsFormVisible(true)}>
          <Plus className="w-4 h-4" />
          Add recipe
        </Button>
      )}
    </div>
  );
}
