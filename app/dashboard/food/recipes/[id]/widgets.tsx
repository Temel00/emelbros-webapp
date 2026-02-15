"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecipeIngredient, Instruction, InventoryItem } from "./actions";
import type { Recipe } from "../actions";
import { RecipeDialog } from "../widgets";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EditRecipeButton({
  recipe,
  ingredients,
  instructions,
  inventory,
}: {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  instructions: Instruction[];
  inventory: InventoryItem[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Dialog closed, refresh to show updated data
      router.refresh();
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>Edit Recipe</Button>
      <RecipeDialog
        open={open}
        onOpenChange={handleOpenChange}
        mode="edit"
        recipe={recipe}
        ingredients={ingredients}
        instructions={instructions}
        inventory={inventory}
      />
    </>
  );
}

export function IngredientsSection({
  ingredients,
}: {
  ingredients: RecipeIngredient[];
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg sm:text-xl font-semibold">Ingredients</h2>

      {ingredients.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ingredients listed.</p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/20">
              <tr>
                <th className="text-left p-2 sm:p-3">Ingredient</th>
                <th className="text-left p-2 sm:p-3">Amount</th>
                <th className="text-right p-2 sm:p-3 hidden sm:table-cell">On Hand</th>
                <th className="text-right p-2 sm:p-3 hidden sm:table-cell">Remainder</th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => {
                const canCompute =
                  !ing.unit ||
                  !ing.inventory.unit ||
                  ing.unit === ing.inventory.unit;
                const remainder = canCompute
                  ? Math.round(
                      (ing.inventory.on_hand_qty - (Number(ing.amount) || 0)) *
                        100,
                    ) / 100
                  : null;

                return (
                  <tr
                    key={ing.id}
                    className={cn(
                      "border-t",
                      remainder !== null &&
                        remainder < 0 &&
                        "bg-destructive/10",
                    )}
                  >
                    <td className="p-2 sm:p-3">{ing.inventory.name}</td>
                    <td className="text-left p-2 sm:p-3">
                      {ing.amount != null ? ing.amount : "—"}{" "}
                      {ing.unit ?? ing.inventory.unit ?? ""}
                    </td>
                    <td className="text-right p-2 sm:p-3 hidden sm:table-cell">
                      {ing.inventory.on_hand_qty} {ing.inventory.unit ?? ""}
                    </td>
                    <td
                      className={cn(
                        "text-right p-2 sm:p-3 font-medium hidden sm:table-cell",
                        remainder !== null && remainder < 0
                          ? "text-destructive"
                          : remainder !== null && remainder > 0.5
                            ? "text-tertiary"
                            : "text-secondary",
                      )}
                    >
                      {remainder !== null
                        ? `${remainder} ${ing.inventory.unit ?? ""}`
                        : "unit mismatch"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function InstructionsSection({
  instructions,
}: {
  instructions: Instruction[];
}) {
  return (
    <div className="space-y-3">
      <h2 className="text-lg sm:text-xl font-semibold">Instructions</h2>

      {instructions.length === 0 ? (
        <p className="text-sm text-muted-foreground">No instructions listed.</p>
      ) : (
        <ol className="space-y-3 sm:space-y-4">
          {instructions.map((step) => (
            <li key={step.id} className="flex gap-2 sm:gap-3">
              <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold mt-0.5 sm:mt-0">
                {step.step_number}
              </span>
              <div className="flex-1 min-w-0 pt-0 sm:pt-1">
                <p className="text-sm sm:text-base">{step.text}</p>
                {step.detail && (
                  <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
