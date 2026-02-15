"use client";

import { useActionState, useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  addRecipe,
  updateRecipe,
  deleteRecipe,
  type Recipe,
  type RecipeActionState,
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
  type ActionState,
  type RecipeIngredient,
  type InventoryItem,
  type Instruction,
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
import {
  Trash2,
  Loader,
  Check,
  ChevronsUpDown,
  GripVertical,
  Pencil,
  Plus,
} from "lucide-react";
import { Cancel } from "@/components/ui/cancel";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  recipe?: Recipe;
  ingredients?: RecipeIngredient[];
  instructions?: Instruction[];
  inventory?: InventoryItem[];
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
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-primary/20",
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
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-primary/20",
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
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-input hover:bg-primary/20",
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
                />
              )}
              {activeTab === "ingredients" && (
                <IngredientsTab
                  recipeId={recipe?.id}
                  ingredients={ingredients}
                  inventory={inventory}
                />
              )}
              {activeTab === "instructions" && (
                <InstructionsTab
                  recipeId={recipe?.id}
                  instructions={instructions}
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
}: {
  mode: "add" | "edit";
  recipe?: Recipe;
  onSuccess: () => void;
}) {
  const action = mode === "add" ? addRecipe : updateRecipe;
  const [state, formAction, pending] = useActionState(action, initialState);
  const [prepMinutes, setPrepMinutes] = useState(recipe?.prep_minutes ?? 0);
  const [cookMinutes, setCookMinutes] = useState(recipe?.cook_minutes ?? 0);
  const [wasPending, setWasPending] = useState(false);

  // Close dialog on success
  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      onSuccess();
      setWasPending(false);
    }
  }, [state.ok, pending, wasPending, onSuccess]);

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

      {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex justify-end pt-4">
        <Button type="submit" disabled={pending}>
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
  inventory,
}: {
  recipeId?: UUID;
  ingredients: RecipeIngredient[];
  inventory: InventoryItem[];
}) {
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
        onDuplicateAttempt={setHighlightedId}
      />
    </div>
  );
}

function IngredientRow({
  ingredient: ing,
  recipeId,
  isHighlighted = false,
}: {
  ingredient: RecipeIngredient;
  recipeId: UUID;
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

  if (isEditing) {
    return (
      <tr className="border-t">
        <td colSpan={5} className="p-2">
          <div className="flex items-center gap-2">
            <form
              action={formAction}
              className="flex items-center gap-2 flex-1 min-w-0"
            >
              <Input type="hidden" name="id" value={ing.id} />
              <Input type="hidden" name="recipe_id" value={recipeId} />
              <Input type="hidden" name="unit" value={unit} />
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
  onDuplicateAttempt,
}: {
  recipeId: UUID;
  inventory: InventoryItem[];
  existingIngredients: RecipeIngredient[];
  onDuplicateAttempt: (inventoryId: string) => void;
}) {
  const [state, formAction, pending] = useActionState(
    addIngredient,
    initialActionState,
  );
  const [selectedId, setSelectedId] = useState("");
  const [unit, setUnit] = useState("");
  const [wasPending, setWasPending] = useState(false);

  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      setSelectedId("");
      setUnit("");
      setWasPending(false);
    }
  }, [pending, state.ok, wasPending]);

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

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending || !selectedId}>
          {pending ? "Adding..." : "Add"}
        </Button>

        {!state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
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
// Instructions Tab
// ─────────────────────────────────────────────────────────────────────────────

function InstructionsTab({
  recipeId,
  instructions,
}: {
  recipeId?: UUID;
  instructions: Instruction[];
}) {
  const [items, setItems] = useState(instructions);
  const [isReordering, setIsReordering] = useState(false);

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
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      )}

      <AddInstructionForm recipeId={recipeId} />
    </div>
  );
}

function SortableInstructionRow({
  instruction,
  recipeId,
  displayNumber,
}: {
  instruction: Instruction;
  recipeId: UUID;
  displayNumber: number;
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
  const [detail, setDetail] = useState(instruction.detail ?? "");

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
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold mt-0.5">
          {displayNumber}
        </span>

        <form action={formAction} className="flex-1 min-w-0 space-y-2">
          <Input type="hidden" name="id" value={instruction.id} />
          <Input type="hidden" name="recipe_id" value={recipeId} />
          <Textarea
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            required
          />
          <Input
            name="detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Detail (optional)"
          />
          <div className="flex justify-between">
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>
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
            <form action={deleteFormAction} onSubmit={handleDelete}>
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
          {!state.ok && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
        </form>
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
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold mt-0.5">
        {displayNumber}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{instruction.text}</p>
        {instruction.detail && (
          <p className="text-xs text-muted-foreground mt-0.5">
            {instruction.detail}
          </p>
        )}
      </div>
    </li>
  );
}

function AddInstructionForm({ recipeId }: { recipeId: UUID }) {
  const [state, formAction, pending] = useActionState(
    addInstruction,
    initialActionState,
  );
  const [text, setText] = useState("");
  const [detail, setDetail] = useState("");
  const [wasPending, setWasPending] = useState(false);

  useEffect(() => {
    if (pending) {
      setWasPending(true);
    } else if (wasPending && state.ok) {
      setText("");
      setDetail("");
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
      <Textarea
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Instruction text..."
        rows={2}
        required
      />
      <Input
        name="detail"
        value={detail}
        onChange={(e) => setDetail(e.target.value)}
        placeholder="Detail (optional)"
      />
      <div className="flex gap-2 items-center">
        <Button type="submit" disabled={pending || !text.trim()}>
          {pending ? "Adding..." : "Add Step"}
        </Button>
        {!state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
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
