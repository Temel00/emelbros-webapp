"use client";

import { useActionState, useState, useEffect, useRef, useTransition, useMemo, useCallback, type FormEvent } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  addRecipe,
  updateRecipe,
  deleteRecipe,
  setRecipeTags,
  createTagInline,
  fetchRecipes,
  type Recipe,
  type RecipeActionState,
  type RecipeWithTags,
  type Tag,
} from "./actions";
import type { UUID } from "crypto";
import {
  addIngredient,
  updateIngredient,
  deleteIngredient,
  addInstruction,
  updateInstruction,
  deleteInstruction,
  reorderInstructions,
  createToolInline,
  type ActionState,
  type RecipeIngredient,
  type InventoryItem,
  type Instruction,
  type Tool,
} from "./[id]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UnitSwitcher } from "@/components/unit-switcher";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Loader,
  Check,
  ChevronsUpDown,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { Cancel } from "@/components/ui/cancel";
import {
  TagColorPicker,
  type TagColor,
} from "@/components/ui/tag-color-picker";
import { TagBadge } from "@/components/ui/tag-badge";

const initialState: RecipeActionState = { ok: true };
const initialActionState: ActionState = { ok: true };

type Tab = "basic" | "ingredients" | "instructions";

// ─────────────────────────────────────────────────────────────────────────────
// Add Recipe Button
// ─────────────────────────────────────────────────────────────────────────────

export function AddRecipeButton() {
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
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Add Recipe
      </Button>
      <RecipeDialog open={open} onOpenChange={handleOpenChange} mode="add" />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipe Dialog (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────

export function RecipeDialog({
  open,
  onOpenChange,
  mode,
  recipe,
  ingredients = [],
  instructions = [],
  inventory = [],
  tools = [],
  tags = [],
  recipeTags = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  recipe?: Recipe;
  ingredients?: RecipeIngredient[];
  instructions?: Instruction[];
  inventory?: InventoryItem[];
  tools?: Tool[];
  tags?: { id: string; name: string; color: string }[];
  recipeTags?: { id: string; tag_id: string; tag: { id: string; name: string } }[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const [dialogKey, setDialogKey] = useState(0);
  const router = useRouter();

  // Reset dialog state when it opens
  useEffect(() => {
    if (open) {
      setActiveTab("basic");
      setDialogKey((prev) => prev + 1); // Force re-mount of tabs
    }
  }, [open]);

  const handleSuccess = () => {
    onOpenChange(false);
    // Don't call router.refresh() here - let the parent page handle it
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] max-h-[90vh] p-0 gap-0 overflow-hidden flex flex-col">
        <div className="flex flex-col sm:flex-row flex-1 min-h-0">
          {/* Tab Navigation — horizontal on mobile, vertical sidebar on sm+ */}
          <div className="flex sm:flex-col sm:w-16 flex-shrink-0 bg-card/20 border-b sm:border-b-0 sm:border-r items-center justify-center sm:justify-start px-4 py-2 sm:px-0 sm:py-6 gap-3 sm:gap-6">
            <button
              type="button"
              onClick={() => setActiveTab("basic")}
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors",
                activeTab === "basic"
                  ? "bg-secondary text-primary-foreground border-secondary"
                  : "border-input hover:bg-secondary/20",
              )}
            >
              1
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ingredients")}
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors",
                activeTab === "ingredients"
                  ? "bg-secondary text-primary-foreground border-secondary"
                  : "border-input hover:bg-secondary/20",
              )}
            >
              2
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("instructions")}
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-full border-2 flex items-center justify-center text-xs sm:text-sm font-semibold transition-colors",
                activeTab === "instructions"
                  ? "bg-secondary text-primary-foreground border-secondary"
                  : "border-input hover:bg-secondary/20",
              )}
            >
              3
            </button>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {/* Header */}
            <DialogHeader className="px-4 sm:px-6 py-3 sm:py-4 border-b flex-shrink-0">
              <DialogTitle>
                {mode === "add" ? "Add Recipe" : "Edit Recipe"}
              </DialogTitle>
              <DialogDescription>
                {mode === "add"
                  ? "Create a new recipe with ingredients and instructions"
                  : "Update recipe details, ingredients, and instructions"}
              </DialogDescription>
            </DialogHeader>

            {/* Tab Content — scrollable */}
            <div
              className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4"
              key={dialogKey}
            >
              {activeTab === "basic" && (
                <BasicInfoTab
                  mode={mode}
                  recipe={recipe}
                  onSuccess={handleSuccess}
                  tags={tags}
                  recipeTags={recipeTags}
                />
              )}
              {activeTab === "ingredients" && (
                <IngredientsTab
                  recipeId={recipe?.id}
                  ingredients={ingredients}
                  instructions={instructions}
                  inventory={inventory}
                />
              )}
              {activeTab === "instructions" && (
                <InstructionsTab
                  recipeId={recipe?.id}
                  instructions={instructions}
                  tools={tools}
                />
              )}
            </div>
          </div>
        </div>

        {/* Footer with Delete button (only in edit mode) */}
        {mode === "edit" && recipe && (
          <div className="flex-shrink-0 border-t px-4 sm:px-6 py-3">
            <DeleteRecipeButton
              recipeId={recipe.id}
              recipeName={recipe.name}
              onSuccess={() => {
                onOpenChange(false);
                router.push("/dashboard/food/recipes");
              }}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Basic Info Tab
// ─────────────────────────────────────────────────────────────────────────────

function BasicInfoTab({
  mode,
  recipe,
  onSuccess,
  tags: initialTags = [],
  recipeTags = [],
}: {
  mode: "add" | "edit";
  recipe?: Recipe;
  onSuccess: () => void;
  tags?: { id: string; name: string; color: string }[];
  recipeTags?: { id: string; tag_id: string; tag: { id: string; name: string } }[];
}) {
  const action = mode === "add" ? addRecipe : updateRecipe;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [prepMinutes, setPrepMinutes] = useState(recipe?.prep_minutes ?? 0);
  const [cookMinutes, setCookMinutes] = useState(recipe?.cook_minutes ?? 0);
  const [wasPending, setWasPending] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    recipeTags.map((rt) => rt.tag_id),
  );
  const [tags, setTags] = useState(initialTags);

  const handleTagCreated = (tag: Tag) => {
    setTags((prev) =>
      [...prev, tag].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  // Close dialog on success, save tags
  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      // Save tags separately if in edit mode
      if (recipe?.id) {
        setRecipeTags(recipe.id, selectedTagIds);
      }
      onSuccess();
      setWasPending(false);
    }
  }, [state.ok, pending, wasPending, onSuccess, recipe?.id, selectedTagIds]);

  return (
    <form action={formAction} className="space-y-4">
      {mode === "edit" && recipe && (
        <Input type="hidden" name="id" value={recipe.id} />
      )}

      <div className="space-y-2">
        <label htmlFor="name" className="text-sm font-medium">
          Recipe Name *
        </label>
        <Input
          id="name"
          name="name"
          defaultValue={recipe?.name}
          placeholder="Enter recipe name"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor="prep_minutes" className="text-sm font-medium">
            Prep Time (minutes) *
          </label>
          <Input
            id="prep_minutes"
            name="prep_minutes"
            type="number"
            min="0"
            value={prepMinutes}
            onChange={(e) => setPrepMinutes(Number(e.target.value))}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="cook_minutes" className="text-sm font-medium">
            Cook Time (minutes) *
          </label>
          <Input
            id="cook_minutes"
            name="cook_minutes"
            type="number"
            min="0"
            value={cookMinutes}
            onChange={(e) => setCookMinutes(Number(e.target.value))}
            placeholder="0"
            required
          />
        </div>
      </div>

      <div className="p-3 bg-card/20 rounded-md">
        <p className="text-sm text-muted-foreground">
          Total Time:{" "}
          <span className="font-semibold">
            {prepMinutes + cookMinutes} minutes
          </span>
        </p>
      </div>

      {mode === "edit" && recipe && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Tags</label>
          <TagMultiSelect
            tags={tags}
            selectedTagIds={selectedTagIds}
            onSelectionChange={setSelectedTagIds}
            onTagCreated={handleTagCreated}
          />
        </div>
      )}

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end pt-4">
        <Button variant={"secondary"} type="submit" disabled={pending}>
          {pending ? (
            <>
              <Loader className="w-4 h-4 animate-spin mr-2" />
              Saving...
            </>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ingredients Tab
// ─────────────────────────────────────────────────────────────────────────────

function IngredientsTab({
  recipeId,
  ingredients,
  instructions,
  inventory,
}: {
  recipeId?: UUID;
  ingredients: RecipeIngredient[];
  instructions: Instruction[];
  inventory: InventoryItem[];
}) {
  const totalSteps = instructions.length;
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  if (!recipeId) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Save the recipe first to add ingredients.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Recipe Ingredients</h3>

      {ingredients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No ingredients added yet.
        </p>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-accent/20">
              <tr>
                <th className="text-left p-2">Ingredient</th>
                <th className="text-left p-2">Amount</th>
                <th className="text-right p-2 hidden sm:table-cell">On Hand</th>
                <th className="text-right p-2 hidden sm:table-cell">
                  Remainder
                </th>
                <th className="p-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  recipeId={recipeId}
                  totalSteps={totalSteps}
                  isHighlighted={highlightedId === ing.inventory.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <AddIngredientForm
        recipeId={recipeId}
        inventory={inventory}
        existingIngredients={ingredients}
        totalSteps={totalSteps}
        onDuplicateAttempt={setHighlightedId}
      />
    </div>
  );
}

function IngredientRow({
  ingredient: ing,
  recipeId,
  totalSteps,
  isHighlighted = false,
}: {
  ingredient: RecipeIngredient;
  recipeId: UUID;
  totalSteps: number;
  isHighlighted?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateIngredient,
    initialActionState,
  );
  const [, deleteFormAction, deletePending] = useActionState(
    deleteIngredient,
    initialActionState,
  );
  const [wasPending, setWasPending] = useState(false);
  const [amount, setAmount] = useState(ing.amount?.toString() ?? "");
  const [unit, setUnit] = useState(ing.unit ?? ing.inventory.unit ?? "");
  const [firstUsedStep, setFirstUsedStep] = useState(
    ing.first_used_step?.toString() ?? "",
  );
  const [usedInSteps, setUsedInSteps] = useState<number[]>(
    ing.used_in_steps ?? [],
  );

  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      setIsEditing(false);
      setWasPending(false);
    }
  }, [pending, state.ok, wasPending]);

  const canCompute =
    !ing.unit || !ing.inventory.unit || ing.unit === ing.inventory.unit;
  const remainder = canCompute
    ? Math.round(
        (ing.inventory.on_hand_qty - (Number(ing.amount) || 0)) * 100,
      ) / 100
    : null;

  const handleDelete = (event: FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      `Remove ${ing.inventory.name} from this recipe?`,
    );
    if (!confirmed) {
      event.preventDefault();
    }
  };

  const toggleUsedInStep = (step: number) => {
    setUsedInSteps((prev) =>
      prev.includes(step)
        ? prev.filter((s) => s !== step)
        : [...prev, step].sort((a, b) => a - b),
    );
  };

  if (isEditing) {
    return (
      <tr className="border-t">
        <td colSpan={5} className="p-2 space-y-2">
          <div className="flex items-center gap-2">
            <form
              action={formAction}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <Input type="hidden" name="id" value={ing.id} />
              <Input type="hidden" name="recipe_id" value={recipeId} />
              <Input type="hidden" name="unit" value={unit} />
              <Input
                type="hidden"
                name="first_used_step"
                value={firstUsedStep}
              />
              <Input
                type="hidden"
                name="used_in_steps"
                value={JSON.stringify(usedInSteps)}
              />
              <span className="text-sm font-medium truncate">
                {ing.inventory.name}
              </span>
              <Input
                name="amount"
                type="number"
                step=".1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amt"
                className="w-16"
              />
              <UnitSwitcher
                currentVal={unit}
                onValueChange={setUnit}
                size="sm"
              />
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <Button
                  variant={"secondary"}
                  type="submit"
                  size="icon"
                  className="w-8 h-8"
                  disabled={pending}
                >
                  {pending ? (
                    <Loader className="w-3 h-3 animate-spin" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  onClick={() => setIsEditing(false)}
                >
                  <Cancel className="w-3 h-3" />
                </Button>
              </div>
            </form>
            <form
              action={deleteFormAction}
              onSubmit={handleDelete}
              className="flex-shrink-0"
            >
              <Input type="hidden" name="id" value={ing.id} />
              <Input type="hidden" name="recipe_id" value={recipeId} />
              <Button
                type="submit"
                variant="ghost"
                size="icon"
                className="text-destructive w-8 h-8"
                disabled={deletePending}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </form>
          </div>

          {totalSteps > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  First used in step
                </label>
                <Input
                  type="number"
                  min="1"
                  max={totalSteps}
                  value={firstUsedStep}
                  onChange={(e) => setFirstUsedStep(e.target.value)}
                  placeholder="—"
                  className="w-14 h-7 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-foreground">
                  Also used in steps
                </label>
                <div className="flex gap-1">
                  {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                    (step) => (
                      <button
                        key={step}
                        type="button"
                        onClick={() => toggleUsedInStep(step)}
                        className={cn(
                          "w-7 h-7 rounded-md border text-xs font-medium transition-colors",
                          usedInSteps.includes(step)
                            ? "bg-secondary text-primary-foreground border-secondary"
                            : "border-input hover:bg-secondary/40",
                        )}
                      >
                        {step}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {!state.ok && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={cn(
        "border-t",
        remainder !== null && remainder < 0 && "bg-destructive/10",
        isHighlighted && "animate-pulse bg-secondary/20",
      )}
    >
      <td className="p-2">{ing.inventory.name}</td>
      <td className="text-left p-2">
        {ing.amount != null ? ing.amount : "—"}{" "}
        {ing.unit ?? ing.inventory.unit ?? ""}
      </td>
      <td className="text-right p-2 hidden sm:table-cell">
        {ing.inventory.on_hand_qty} {ing.inventory.unit ?? ""}
      </td>
      <td
        className={cn(
          "text-right p-2 font-medium hidden sm:table-cell",
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
      <td className="p-2 text-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Edit</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </td>
    </tr>
  );
}

function AddIngredientForm({
  recipeId,
  inventory,
  existingIngredients,
  totalSteps,
  onDuplicateAttempt,
}: {
  recipeId: UUID;
  inventory: InventoryItem[];
  existingIngredients: RecipeIngredient[];
  totalSteps: number;
  onDuplicateAttempt: (inventoryId: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    addIngredient,
    initialActionState,
  );
  const [selectedId, setSelectedId] = useState("");
  const [unit, setUnit] = useState("");
  const [firstUsedStep, setFirstUsedStep] = useState("");
  const [usedInSteps, setUsedInSteps] = useState<number[]>([]);
  const [wasPending, setWasPending] = useState(false);

  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      setSelectedId("");
      setUnit("");
      setFirstUsedStep("");
      setUsedInSteps([]);
      setWasPending(false);
    }
  }, [pending, state.ok, wasPending]);

  const toggleUsedInStep = (step: number) => {
    setUsedInSteps((prev) =>
      prev.includes(step)
        ? prev.filter((s) => s !== step)
        : [...prev, step].sort((a, b) => a - b),
    );
  };

  const handleSelect = (id: string, itemUnit: string | null) => {
    const isDuplicate = existingIngredients.some(
      (ing) => ing.inventory.id === id,
    );

    if (isDuplicate) {
      onDuplicateAttempt(id);
      setSelectedId("");
      setUnit("");
      return;
    }

    setSelectedId(id);
    setUnit(itemUnit ?? "");
  };

  return (
    <form
      action={formAction}
      className="space-y-3 mt-4 p-3 sm:p-4 border rounded-lg"
    >
      <Input type="hidden" name="recipe_id" value={recipeId} />
      <Input type="hidden" name="inventory_id" value={selectedId} />
      <Input type="hidden" name="unit" value={unit} />
      <Input type="hidden" name="first_used_step" value={firstUsedStep} />
      <Input
        type="hidden"
        name="used_in_steps"
        value={JSON.stringify(usedInSteps)}
      />

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Ingredient</label>
        <InventoryCombobox
          inventory={inventory}
          value={selectedId}
          onSelect={handleSelect}
        />
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Amount</label>
          <Input name="amount" type="number" step="any" className="w-20" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Unit</label>
          <UnitSwitcher currentVal={unit} onValueChange={setUnit} size="sm" />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">Note</label>
          <Input name="note" placeholder="optional" className="w-24" />
        </div>
      </div>

      {totalSteps > 0 && (
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">First used in step</label>
            <Input
              type="number"
              min="1"
              max={totalSteps}
              value={firstUsedStep}
              onChange={(e) => setFirstUsedStep(e.target.value)}
              placeholder="—"
              className="w-20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">Also used in steps</label>
            <div className="flex gap-1">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map(
                (step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => toggleUsedInStep(step)}
                    className={cn(
                      "w-8 h-8 rounded-md border text-xs font-medium transition-colors",
                      usedInSteps.includes(step)
                        ? "bg-secondary text-primary-foreground border-secondary"
                        : "border-input hover:bg-secondary/40",
                    )}
                  >
                    {step}
                  </button>
                ),
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          variant={"secondary"}
          type="submit"
          disabled={pending || !selectedId}
        >
          {pending ? "Adding..." : "Add"}
        </Button>

        {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

function InventoryCombobox({
  inventory,
  value,
  onSelect,
}: {
  inventory: InventoryItem[];
  value: string;
  onSelect: (id: string, unit: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = inventory.find((item) => item.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full sm:w-[200px] justify-between"
        >
          {selected ? selected.name : "Select ingredient..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] sm:w-[200px] p-0">
        <Command>
          <CommandInput placeholder="Search inventory..." />
          <CommandList>
            <CommandEmpty>No ingredient found.</CommandEmpty>
            <CommandGroup>
              {inventory.map((item) => (
                <CommandItem
                  key={item.id}
                  value={item.name}
                  onSelect={() => {
                    onSelect(item.id, item.unit);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === item.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {item.name}
                  {item.unit && (
                    <span className="ml-auto text-muted-foreground text-xs">
                      ({item.unit})
                    </span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Multi-Select Combobox
// ─────────────────────────────────────────────────────────────────────────────

function ToolMultiSelect({
  tools,
  selectedToolIds,
  onSelectionChange,
  onToolCreated,
}: {
  tools: Tool[];
  selectedToolIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onToolCreated: (tool: Tool) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const selectedTools = tools.filter((t) => selectedToolIds.includes(t.id));
  const label =
    selectedTools.length > 0
      ? selectedTools.map((t) => t.name).join(", ")
      : "Select tools...";

  const handleToggle = (toolId: string) => {
    if (selectedToolIds.includes(toolId)) {
      onSelectionChange(selectedToolIds.filter((id) => id !== toolId));
    } else {
      onSelectionChange([...selectedToolIds, toolId]);
    }
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    setIsCreating(true);
    const result = await createToolInline(search.trim());
    setIsCreating(false);
    if (result.ok && result.tool) {
      onToolCreated(result.tool);
      onSelectionChange([...selectedToolIds, result.tool.id]);
      setSearch("");
    }
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate text-left flex-1">{label}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput
              placeholder="Search tools..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {isCreating ? "Creating..." : `Add "${search}"`}
                </button>
              </CommandEmpty>
              <CommandGroup>
                {tools.map((tool) => (
                  <CommandItem
                    key={tool.id}
                    value={tool.name}
                    onSelect={() => handleToggle(tool.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedToolIds.includes(tool.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {tool.name}
                    {tool.location && (
                      <span className="ml-auto text-muted-foreground text-xs">
                        ({tool.location})
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedTools.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTools.map((tool) => (
            <Badge key={tool.id} variant="secondary" className="text-xs">
              {tool.name}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tag Multi-Select Combobox
// ─────────────────────────────────────────────────────────────────────────────

function TagMultiSelect({
  tags,
  selectedTagIds,
  onSelectionChange,
  onTagCreated,
}: {
  tags: { id: string; name: string; color: string }[];
  selectedTagIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onTagCreated: (tag: Tag) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [newTagColor, setNewTagColor] = useState<TagColor>("primary");

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));
  const label =
    selectedTags.length > 0
      ? selectedTags.map((t) => t.name).join(", ")
      : "Select tags...";

  const handleToggle = (tagId: string) => {
    if (selectedTagIds.includes(tagId)) {
      onSelectionChange(selectedTagIds.filter((id) => id !== tagId));
    } else {
      onSelectionChange([...selectedTagIds, tagId]);
    }
  };

  const handleCreate = async () => {
    if (!search.trim()) return;
    setIsCreating(true);
    const result = await createTagInline(search.trim(), newTagColor);
    setIsCreating(false);
    if (result.ok && result.tag) {
      onTagCreated(result.tag);
      onSelectionChange([...selectedTagIds, result.tag.id]);
      setSearch("");
      setNewTagColor("primary");
    }
  };

  return (
    <div className="space-y-1.5">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate text-left flex-1">{label}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
          <Command>
            <CommandInput
              placeholder="Search tags..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>
                <div className="px-2 py-1.5 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Create new tag: <span className="font-medium">{search}</span>
                  </p>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium">Color</label>
                    <TagColorPicker
                      value={newTagColor}
                      onChange={setNewTagColor}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={isCreating}
                    className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:text-primary transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    {isCreating ? "Creating..." : "Create Tag"}
                  </button>
                </div>
              </CommandEmpty>
              <CommandGroup>
                {tags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.name}
                    onSelect={() => handleToggle(tag.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedTagIds.includes(tag.id)
                          ? "opacity-100"
                          : "opacity-0",
                      )}
                    />
                    {tag.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedTags.map((tag) => (
            <TagBadge key={tag.id} name={tag.name} color={tag.color} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Instructions Tab
// ─────────────────────────────────────────────────────────────────────────────

function InstructionsTab({
  recipeId,
  instructions,
  tools: initialTools = [],
}: {
  recipeId?: UUID;
  instructions: Instruction[];
  tools?: Tool[];
}) {
  const [items, setItems] = useState(instructions);
  const [isReordering, setIsReordering] = useState(false);
  const [tools, setTools] = useState<Tool[]>(initialTools);

  const handleToolCreated = (tool: Tool) => {
    setTools((prev) =>
      [...prev, tool].sort((a, b) => a.name.localeCompare(b.name)),
    );
  };

  useEffect(() => {
    setItems(instructions);
  }, [instructions]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id || !recipeId) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);

    setItems(newItems);

    setIsReordering(true);
    reorderInstructions(
      recipeId,
      newItems.map((i) => i.id),
    ).finally(() => setIsReordering(false));
  };

  if (!recipeId) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Save the recipe first to add instructions.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-lg font-semibold">Instructions</h3>
        {isReordering && (
          <span className="text-sm text-muted-foreground">Saving...</span>
        )}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No instructions added yet.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            <ol className="space-y-2">
              {items.map((step, index) => (
                <SortableInstructionRow
                  key={step.id}
                  instruction={step}
                  recipeId={recipeId}
                  displayNumber={index + 1}
                  tools={tools}
                  onToolCreated={handleToolCreated}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <AddInstructionForm
        recipeId={recipeId}
        tools={tools}
        onToolCreated={handleToolCreated}
      />
    </div>
  );
}

function SortableInstructionRow({
  instruction,
  recipeId,
  displayNumber,
  tools,
  onToolCreated,
}: {
  instruction: Instruction;
  recipeId: UUID;
  displayNumber: number;
  tools: Tool[];
  onToolCreated: (tool: Tool) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateInstruction,
    initialActionState,
  );
  const [, deleteFormAction, deletePending] = useActionState(
    deleteInstruction,
    initialActionState,
  );
  const [wasPending, setWasPending] = useState(false);
  const [text, setText] = useState(instruction.text);
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>(
    (instruction.instruction_tools ?? []).map((it) => it.tool_id),
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instruction.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      setIsEditing(false);
      setWasPending(false);
    }
  }, [pending, state.ok, wasPending]);

  const handleDelete = (event: FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm("Delete this instruction step?");
    if (!confirmed) {
      event.preventDefault();
    }
  };

  if (isEditing) {
    return (
      <li
        ref={setNodeRef}
        style={style}
        className="flex items-start gap-2 p-2 border rounded-lg bg-background"
      >
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-primary-foreground flex items-center justify-center text-xs font-semibold mt-0.5">
          {displayNumber}
        </span>

        <div className="flex-1 min-w-0 space-y-2">
          <form action={formAction} className="space-y-2">
            <Input type="hidden" name="id" value={instruction.id} />
            <Input type="hidden" name="recipe_id" value={recipeId} />
            <Input
              type="hidden"
              name="tool_ids"
              value={JSON.stringify(selectedToolIds)}
            />
            <Textarea
              name="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              required
            />
            <ToolMultiSelect
              tools={tools}
              selectedToolIds={selectedToolIds}
              onSelectionChange={setSelectedToolIds}
              onToolCreated={onToolCreated}
            />
            <div className="flex gap-2">
              <Button
                variant={"secondary"}
                type="submit"
                size="sm"
                disabled={pending}
              >
                {pending ? "Saving..." : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
            </div>
            {!state.ok && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </form>
          <form
            action={deleteFormAction}
            onSubmit={handleDelete}
            className="flex justify-end"
          >
            <Input type="hidden" name="id" value={instruction.id} />
            <Input type="hidden" name="recipe_id" value={recipeId} />
            <Button
              type="submit"
              variant="iconDestructive"
              size="icon"
              disabled={deletePending}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </form>
        </div>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex gap-2 p-2 border rounded-lg bg-background group"
    >
      <div className="flex flex-col justify-between">
        <button
          type="button"
          className="flex-shrink-0 cursor-grab active:cursor-grabbing touch-none p-1 mt-0.5"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex flex-col gap-0.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
                  size="icon"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary text-primary-foreground flex items-center justify-center text-xs font-semibold mt-0.5">
        {displayNumber}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{instruction.text}</p>
        {(instruction.instruction_tools ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {instruction.instruction_tools.map((it) => (
              <Badge key={it.id} variant="secondary" className="text-xs">
                {it.tool.name}
              </Badge>
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

function AddInstructionForm({
  recipeId,
  tools,
  onToolCreated,
}: {
  recipeId: UUID;
  tools: Tool[];
  onToolCreated: (tool: Tool) => void;
}) {
  const [state, formAction, pending] = useActionState(
    addInstruction,
    initialActionState,
  );
  const [text, setText] = useState("");
  const [selectedToolIds, setSelectedToolIds] = useState<string[]>([]);
  const [wasPending, setWasPending] = useState(false);

  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      setText("");
      setSelectedToolIds([]);
      setWasPending(false);
    }
  }, [pending, state.ok, wasPending]);

  return (
    <form
      action={formAction}
      className="space-y-3 mt-4 p-3 sm:p-4 border rounded-lg"
    >
      <h4 className="text-sm sm:text-base font-medium">Add New Step</h4>
      <Input type="hidden" name="recipe_id" value={recipeId} />
      <Input
        type="hidden"
        name="tool_ids"
        value={JSON.stringify(selectedToolIds)}
      />
      <Textarea
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Instruction text..."
        rows={2}
        required
      />
      <ToolMultiSelect
        tools={tools}
        selectedToolIds={selectedToolIds}
        onSelectionChange={setSelectedToolIds}
        onToolCreated={onToolCreated}
      />
      <div className="flex gap-2 items-center">
        <Button
          variant={"secondary"}
          type="submit"
          disabled={pending || !text.trim()}
        >
          {pending ? "Adding..." : "Add Step"}
        </Button>
        {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Recipe Button
// ─────────────────────────────────────────────────────────────────────────────

function DeleteRecipeButton({
  recipeId,
  recipeName,
  onSuccess,
}: {
  recipeId: UUID;
  recipeName: string;
  onSuccess: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    deleteRecipe,
    initialState,
  );
  const [wasPending, setWasPending] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${recipeName}"? This will permanently remove the recipe, all its ingredients, and all instructions. This action cannot be undone.`,
    );
    if (!confirmed) {
      event.preventDefault();
    }
  };

  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      onSuccess();
      setWasPending(false);
    }
  }, [state.ok, pending, wasPending, onSuccess]);

  return (
    <form action={formAction} onSubmit={handleSubmit}>
      <Input type="hidden" name="id" value={recipeId} />
      <Button
        type="submit"
        variant="ghost"
        size="icon"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        disabled={pending}
      >
        <Trash2 className="w-5 h-5" />
      </Button>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipe Search & Filter Components
// ─────────────────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 15;

const TIME_RANGE_OPTIONS = [
  { value: "all", label: "All recipes" },
  { value: "15", label: "Under 15 min" },
  { value: "30", label: "Under 30 min" },
  { value: "60", label: "Under 1 hour" },
  { value: "999", label: "1 hour or more" },
];

export function RecipeSearchFilter({
  allTags,
  allTools,
}: {
  allTags: Tag[];
  allTools: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Get stable URL param string
  const urlParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const currentSearch = useMemo(() => searchParams.get("q") ?? "", [searchParams]);

  const [searchValue, setSearchValue] = useState(currentSearch);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUrlParamsRef = useRef(urlParamsString);

  // Sync search value when URL changes from external source (browser back/forward)
  useEffect(() => {
    if (lastUrlParamsRef.current !== urlParamsString) {
      setSearchValue(currentSearch);
      lastUrlParamsRef.current = urlParamsString;
    }
  }, [currentSearch, urlParamsString]);

  const handleSearchChange = (value: string) => {
    setSearchValue(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the URL update
    debounceTimerRef.current = setTimeout(() => {
      if (value !== currentSearch) {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
          params.set("q", value);
        } else {
          params.delete("q");
        }
        startTransition(() => {
          router.push(`${pathname}?${params.toString()}`);
        });
      }
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search recipes..."
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
        />
        {isPending && (
          <Loader className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <TagMultiSelectFilter tags={allTags} />
      <ToolMultiSelectFilter tools={allTools} />
      <TimeRangeFilter />
    </div>
  );
}

function TagMultiSelectFilter({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Get stable URL param values
  const urlParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const urlTagsString = useMemo(() => searchParams.get("tags") ?? "", [searchParams]);

  const currentIds = useMemo(
    () => urlTagsString.split(",").filter((id) => id.length > 0),
    [urlTagsString]
  );

  const [pendingIds, setPendingIds] = useState<string[]>(currentIds);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUrlParamsRef = useRef(urlParamsString);

  // Sync pending IDs when URL changes from external source
  useEffect(() => {
    if (lastUrlParamsRef.current !== urlParamsString) {
      setPendingIds(currentIds);
      lastUrlParamsRef.current = urlParamsString;
    }
  }, [currentIds, urlParamsString]);

  const handleToggleTag = (tagId: string) => {
    const newSelected = pendingIds.includes(tagId)
      ? pendingIds.filter((id) => id !== tagId)
      : [...pendingIds, tagId];

    setPendingIds(newSelected);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the URL update
    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSelected.length > 0) {
        params.set("tags", newSelected.join(","));
      } else {
        params.delete("tags");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const selectedTags = tags.filter((t) => pendingIds.includes(t.id));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[140px]">
          {selectedTags.length > 0 ? (
            <span className="flex items-center gap-1">
              Tags ({selectedTags.length})
              {isPending && <Loader className="w-3 h-3 animate-spin" />}
            </span>
          ) : (
            "All Tags"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search tags..." />
          <CommandList>
            <CommandEmpty>No tags found.</CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => {
                const isSelected = pendingIds.includes(tag.id);
                return (
                  <CommandItem
                    key={tag.id}
                    onSelect={() => handleToggleTag(tag.id)}
                  >
                    <Checkbox checked={isSelected} className="mr-2" />
                    <TagBadge name={tag.name} color={tag.color} />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function ToolMultiSelectFilter({
  tools,
}: {
  tools: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Get stable URL param values
  const urlParamsString = useMemo(() => searchParams.toString(), [searchParams]);
  const urlToolsString = useMemo(() => searchParams.get("tools") ?? "", [searchParams]);

  const currentIds = useMemo(
    () => urlToolsString.split(",").filter((id) => id.length > 0),
    [urlToolsString]
  );

  const [pendingIds, setPendingIds] = useState<string[]>(currentIds);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastUrlParamsRef = useRef(urlParamsString);

  // Sync pending IDs when URL changes from external source
  useEffect(() => {
    if (lastUrlParamsRef.current !== urlParamsString) {
      setPendingIds(currentIds);
      lastUrlParamsRef.current = urlParamsString;
    }
  }, [currentIds, urlParamsString]);

  const handleToggleTool = (toolId: string) => {
    const newSelected = pendingIds.includes(toolId)
      ? pendingIds.filter((id) => id !== toolId)
      : [...pendingIds, toolId];

    setPendingIds(newSelected);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce the URL update
    debounceTimerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (newSelected.length > 0) {
        params.set("tools", newSelected.join(","));
      } else {
        params.delete("tools");
      }
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    }, 500);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[140px]">
          {pendingIds.length > 0 ? (
            <span className="flex items-center gap-1">
              Tools ({pendingIds.length})
              {isPending && <Loader className="w-3 h-3 animate-spin" />}
            </span>
          ) : (
            "All Tools"
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
        <Command>
          <CommandInput placeholder="Search tools..." />
          <CommandList>
            <CommandEmpty>No tools found.</CommandEmpty>
            <CommandGroup>
              {tools.map((tool) => {
                const isSelected = pendingIds.includes(tool.id);
                return (
                  <CommandItem
                    key={tool.id}
                    onSelect={() => handleToggleTool(tool.id)}
                  >
                    <Checkbox checked={isSelected} className="mr-2" />
                    {tool.name}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function TimeRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentValue = searchParams.get("time") ?? "all";

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("time", value);
    } else {
      params.delete("time");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const selectedLabel =
    TIME_RANGE_OPTIONS.find((opt) => opt.value === currentValue)?.label ??
    "All recipes";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between min-w-[150px]">
          <Clock className="w-4 h-4 mr-2" />
          {selectedLabel}
          {isPending && <Loader className="w-3 h-3 ml-1 animate-spin" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value={currentValue} onValueChange={handleChange}>
          {TIME_RANGE_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function InfiniteRecipesList({
  initialRecipes,
  initialHasMore,
  search,
  tagIds,
  toolIds,
  timeRange,
  allTags,
  allTools,
}: {
  initialRecipes: RecipeWithTags[];
  initialHasMore: boolean;
  search: string;
  tagIds: string[];
  toolIds: string[];
  timeRange: number | null;
  allTags: Tag[];
  allTools: { id: string; name: string }[];
}) {
  const [items, setItems] = useState<RecipeWithTags[]>(initialRecipes);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [loadNumber, setLoadNumber] = useState(1);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  // Create stable filter key for memoization
  const filterKey = useMemo(() => {
    const sortedTags = [...tagIds].sort().join(",");
    const sortedTools = [...toolIds].sort().join(",");
    return `${search}|${sortedTags}|${sortedTools}|${timeRange}`;
  }, [search, tagIds, toolIds, timeRange]);

  const lastFilterKeyRef = useRef(filterKey);

  // Reset list when filters change
  useEffect(() => {
    if (lastFilterKeyRef.current !== filterKey) {
      setItems(initialRecipes);
      setLoadNumber(1);
      setHasMore(initialHasMore);
      lastFilterKeyRef.current = filterKey;
    }
  }, [filterKey, initialRecipes, initialHasMore]);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    const { recipes, hasMore: newHasMore } = await fetchRecipes(
      loadNumber * ITEMS_PER_PAGE,
      ITEMS_PER_PAGE,
      search,
      tagIds,
      toolIds,
      timeRange,
    );

    setItems((prev) => [...prev, ...recipes]);
    setHasMore(newHasMore);
    setLoadNumber((prev) => prev + 1);
    setLoading(false);
  }, [loading, hasMore, loadNumber, search, tagIds, toolIds, timeRange]);

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore || loading) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "100px" } // Start loading slightly before reaching the bottom
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [hasMore, loading, loadMore]);

  const hasActiveFilters =
    search || tagIds.length > 0 || toolIds.length > 0 || timeRange !== null;

  if (items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {hasActiveFilters
          ? "No recipes match your filters. Try adjusting your search criteria."
          : "No recipes found. Add your first recipe to get started!"}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((recipe) => (
          <Card
            key={recipe.id}
            className="flex flex-col hover:bg-secondary/40 hover:scale-105 transition-all ease-in-out duration-300"
          >
            <Link href={`/dashboard/food/recipes/${recipe.id}`}>
              <CardHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="flex-shrink-0">{recipe.name}</CardTitle>
                  {recipe.recipe_tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.recipe_tags.map((rt) => (
                        <TagBadge
                          key={rt.id}
                          name={rt.tag.name}
                          color={rt.tag.color}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-end justify-between">
                  <div className="flex gap-1">
                    <Badge variant="ghost">Prep: {recipe.prep_minutes}m</Badge>
                    <Badge variant="ghost">Cook: {recipe.cook_minutes}m</Badge>
                  </div>
                  <Badge variant="ghostAccent">
                    Total: {recipe.total_minutes}m
                  </Badge>
                </div>
              </CardContent>
            </Link>
          </Card>
        ))}
      </div>
      {hasMore && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {loading && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader className="w-4 h-4 animate-spin" />
              Loading more recipes...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
