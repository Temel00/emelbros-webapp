"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type {
  RecipeIngredient,
  Instruction,
  InventoryItem,
  Tool,
} from "./actions";
import type { Recipe } from "../actions";
import { RecipeDialog } from "../widgets";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, TriangleAlert } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Edit Recipe Button
// ─────────────────────────────────────────────────────────────────────────────

export function EditRecipeButton({
  recipe,
  ingredients,
  instructions,
  inventory,
  tools = [],
  tags = [],
  recipeTags = [],
}: {
  recipe: Recipe;
  ingredients: RecipeIngredient[];
  instructions: Instruction[];
  inventory: InventoryItem[];
  tools?: Tool[];
  tags?: { id: string; name: string; color: string }[];
  recipeTags?: { id: string; tag_id: string; tag: { id: string; name: string; color: string } }[];
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      router.refresh();
    }
  };

  return (
    <>
      <Button variant={"secondary"} onClick={() => setOpen(true)}>
        Edit Recipe
      </Button>
      <RecipeDialog
        open={open}
        onOpenChange={handleOpenChange}
        mode="edit"
        recipe={recipe}
        ingredients={ingredients}
        instructions={instructions}
        inventory={inventory}
        tools={tools}
        tags={tags}
        recipeTags={recipeTags}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────────────────────

function IngredientBadge({
  ingredient,
  variant = "full",
}: {
  ingredient: RecipeIngredient;
  variant?: "full" | "reference";
}) {
  const name = ingredient.inventory.name;

  if (variant === "reference") {
    return (
      <Badge variant="ghost" className="text-xs text-muted-foreground">
        + {name}
      </Badge>
    );
  }

  const amount = ingredient.amount != null ? ingredient.amount : "";
  const unit = ingredient.unit ?? ingredient.inventory.unit ?? "";
  const label = [amount, unit, name].filter(Boolean).join(" ");

  return (
    <Badge variant="outline" className="text-xs">
      {label}
    </Badge>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible Ingredient Summary
// ─────────────────────────────────────────────────────────────────────────────

function CollapsibleIngredientSummary({
  ingredients,
}: {
  ingredients: RecipeIngredient[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (ingredients.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm font-medium hover:text-secondary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        Ingredients ({ingredients.length})
      </button>

      {expanded && (
        <div className="flex flex-wrap gap-1.5 pl-5.5">
          {ingredients.map((ing) => (
            <IngredientBadge key={ing.id} ingredient={ing} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Collapsible Tools Summary
// ─────────────────────────────────────────────────────────────────────────────

function ToolBadge({ tool }: { tool: { name: string } }) {
  return (
    <Badge variant="secondary" className="text-xs">
      {tool.name}
    </Badge>
  );
}

function CollapsibleToolsSummary({
  instructions,
}: {
  instructions: Instruction[];
}) {
  const [expanded, setExpanded] = useState(false);

  // Collect unique tools across all instructions
  const toolMap = new Map<string, { id: string; name: string }>();
  for (const instr of instructions) {
    for (const it of instr.instruction_tools ?? []) {
      if (!toolMap.has(it.tool.id)) {
        toolMap.set(it.tool.id, it.tool);
      }
    }
  }
  const allTools = Array.from(toolMap.values());

  if (allTools.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-sm font-medium hover:text-secondary transition-colors"
      >
        {expanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        Tools ({allTools.length})
      </button>

      {expanded && (
        <div className="flex flex-wrap gap-1.5 pl-5.5">
          {allTools.map((tool) => (
            <ToolBadge key={tool.id} tool={tool} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Unassigned Ingredients Warning
// ─────────────────────────────────────────────────────────────────────────────

function UnassignedIngredients({
  ingredients,
}: {
  ingredients: RecipeIngredient[];
}) {
  const unassigned = ingredients.filter((ing) => ing.first_used_step == null);

  if (unassigned.length === 0) return null;

  return (
    <div className="rounded-lg bg-secondary/20 p-3 space-y-2">
      <div className="flex items-center gap-1.5 text-sm font-medium text-secondary">
        <TriangleAlert className="w-3.5 h-3.5" />
        Unassigned Ingredients
      </div>
      <div className="flex flex-wrap gap-1.5">
        {unassigned.map((ing) => (
          <TooltipProvider key={ing.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <IngredientBadge ingredient={ing} />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Set a &quot;first used step&quot; in Edit Recipe</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component: Recipe Steps Section
// ─────────────────────────────────────────────────────────────────────────────

export function RecipeStepsSection({
  ingredients,
  instructions,
}: {
  ingredients: RecipeIngredient[];
  instructions: Instruction[];
}) {
  // Build lookup: step_number → ingredients first used in that step
  const firstUsedMap = new Map<number, RecipeIngredient[]>();
  for (const ing of ingredients) {
    if (ing.first_used_step != null) {
      const list = firstUsedMap.get(ing.first_used_step) ?? [];
      list.push(ing);
      firstUsedMap.set(ing.first_used_step, list);
    }
  }

  // Build lookup: step_number → ingredients referenced (used_in_steps) but not first used here
  const referencedMap = new Map<number, RecipeIngredient[]>();
  for (const ing of ingredients) {
    if (ing.used_in_steps && ing.used_in_steps.length > 0) {
      for (const step of ing.used_in_steps) {
        // Only show as reference if this isn't the first_used_step
        if (step !== ing.first_used_step) {
          const list = referencedMap.get(step) ?? [];
          list.push(ing);
          referencedMap.set(step, list);
        }
      }
    }
  }

  return (
    <div className="space-y-4">
      <CollapsibleIngredientSummary ingredients={ingredients} />
      <CollapsibleToolsSummary instructions={instructions} />
      <UnassignedIngredients ingredients={ingredients} />

      {/* Instructions */}
      <div className="space-y-3">
        <h2 className="text-lg sm:text-xl font-semibold">Instructions</h2>

        {instructions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No instructions listed.
          </p>
        ) : (
          <ol className="space-y-4">
            {instructions.map((step) => {
              const firstUsed = firstUsedMap.get(step.step_number) ?? [];
              const referenced = referencedMap.get(step.step_number) ?? [];
              const hasIngredients =
                firstUsed.length > 0 || referenced.length > 0;
              const stepTools = step.instruction_tools ?? [];
              const hasBadges = hasIngredients || stepTools.length > 0;

              return (
                <li key={step.id} className="flex gap-2 sm:gap-3">
                  <span className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary text-primary-foreground flex items-center justify-center text-xs sm:text-sm font-semibold mt-0.5 sm:mt-0">
                    {step.step_number}
                  </span>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-sm sm:text-base pt-0 sm:pt-1">
                      {step.text}
                    </p>
                    {hasBadges && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {firstUsed.map((ing) => (
                          <IngredientBadge key={ing.id} ingredient={ing} />
                        ))}
                        {referenced.map((ing) => (
                          <IngredientBadge
                            key={`ref-${ing.id}`}
                            ingredient={ing}
                            variant="reference"
                          />
                        ))}
                        {stepTools.map((it) => (
                          <ToolBadge key={it.id} tool={it.tool} />
                        ))}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
