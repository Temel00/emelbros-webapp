"use client";

import { useActionState, useState } from "react";
import {
  addRecipe,  
  type RecipeActionState,
} from "./actions";
import { Button } from "@/components/ui/button";

const initialState: RecipeActionState = { ok: true };

function AddRecipeForm() {
  const [state, formAction, pending] = useActionState(addRecipe, initialState);

  return (
    <form
      action={formAction}
      className="flex items-end justify-start p-4 gap-2"
    >
      <div className="flex flex-col">
        <label htmlFor="recipe-name">Name</label>
        <input
          id="recipe-name"
          name="name"
          placeholder="Recipe name"
          className="border px-2 py-1 h-10 rounded"
          required
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="prep-minutes">Prep (min)</label>
        <input
          id="prep-minutes"
          name="prep_minutes"
          placeholder="0"
          type="number"
          min={0}
          className="border px-2 py-1 h-10 rounded w-24"
          required
        />
      </div>
      <div className="flex flex-col">
        <label htmlFor="cook-minutes">Cook (min)</label>
        <input
          id="cook-minutes"
          name="cook_minutes"
          placeholder="0"
          type="number"
          min={0}
          className="border px-2 py-1 h-10 rounded w-24"
          required
        />
      </div>
      <button
        type="submit"
        className="border px-3 py-1 mx-8 self-center rounded"
        disabled={pending}
      >
        {pending ? "Adding..." : "Add"}
      </button>
      {!state.ok && <span className="text-red-600 text-sm">{state.error}</span>}
    </form>
  );
}

export function RecipeFormToggle() {
  const [isFormVisible, setIsFormVisible] = useState(false);

  return (
    <div className="space-y-4">
      {isFormVisible ? (
        <div>
          <Button onClick={() => setIsFormVisible(false)}>Close</Button>
          <AddRecipeForm />
        </div>
      ) : (
        <Button onClick={() => setIsFormVisible(true)}>Add recipe</Button>
      )}
    </div>
  );
}


