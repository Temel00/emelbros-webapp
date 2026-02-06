"use client";

import { useActionState, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { updateRecipe, deleteRecipe, type RecipeActionState } from "../actions";
import {
  addIngredient,
  updateIngredient,
  deleteIngredient,
  addInstruction,
  updateInstruction,
  deleteInstruction,
  reorderInstructions,
  type ActionState,
} from "./actions";
import type { UUID } from "crypto";
import type { RecipeIngredient, InventoryItem, Instruction } from "./page";
import { BackArrow } from "@/components/ui/back-arrow";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EditGear } from "@/components/ui/edit-gear";
import { Cancel } from "@/components/ui/cancel";
import { Input } from "@/components/ui/input";
import { UnitSwitcher } from "@/components/unit-switcher";
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
import {
  Check,
  ChevronsUpDown,
  GripVertical,
  Pencil,
  Trash2,
} from "lucide-react";

const initialState: RecipeActionState = { ok: true };
const initialActionState: ActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// EDIT MODE TOGGLE
// ─────────────────────────────────────────────────────────────────────────────

export function EditModeToggle({ editMode }: { editMode: boolean }) {
  const router = useRouter();
  const pathname = usePathname();

  const toggleEditMode = () => {
    if (editMode) {
      router.push(pathname);
    } else {
      router.push(`${pathname}?edit=1`);
    }
  };

  return (
    <Button variant={editMode ? "default" : "outline"} onClick={toggleEditMode}>
      {editMode ? "Done Editing" : "Edit Recipe"}
    </Button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE RECIPE FORM (EXISTING)
// ─────────────────────────────────────────────────────────────────────────────

export function UpdateRecipeForm({
  id,
  currentName,
  currentPrepMinutes,
  currentCookMinutes,
}: {
  id: UUID;
  currentName: string;
  currentPrepMinutes: number;
  currentCookMinutes: number;
}) {
  const [state, formAction, pending] = useActionState(
    updateRecipe,
    initialState,
  );
  const [showUpdateRecipe, setShowUpdateRecipe] = useState(false);
  const [prepMinutes, setPrepMinutes] = useState(currentPrepMinutes);
  const [cookMinutes, setCookMinutes] = useState(currentCookMinutes);

  return showUpdateRecipe ? (
    <div className="flex justify-between items-center">
      <form action={formAction} className="flex items-center gap-6">
        <div className="flex flex-col gap-2">
          <div>
            <input type="hidden" name="id" value={id} />
            <input
              name="name"
              defaultValue={currentName}
              className="border px-2 py-1 rounded text-xl"
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-start">
              <label htmlFor="prep_minutes">Prep:</label>
              <input
                id="prep_minutes"
                name="prep_minutes"
                defaultValue={prepMinutes}
                type="number"
                min={0}
                onChange={(e) => setPrepMinutes(Number(e.target.value))}
                className="border px-2 py-1 rounded w-20"
              />
            </div>
            <div className="flex items-center justify-start">
              <label htmlFor="cook_minutes">Cook:</label>
              <input
                id="cook_minutes"
                name="cook_minutes"
                defaultValue={cookMinutes}
                type="number"
                min={0}
                onChange={(e) => setCookMinutes(Number(e.target.value))}
                className="border px-2 py-1 rounded w-20"
              />
            </div>
            <div>
              <h2>Total: {prepMinutes + cookMinutes}</h2>
            </div>
          </div>
        </div>
        <button
          type="submit"
          className="border px-3 py-1 rounded"
          disabled={pending}
        >
          {pending ? "Saving..." : "Save"}
        </button>
        {!state.ok && (
          <span className="text-red-600 text-sm">{state.error}</span>
        )}
      </form>
      <EditGear
        onClick={() =>
          setShowUpdateRecipe((prevShowUpdateRecipe) => !prevShowUpdateRecipe)
        }
        className="w-5 h-5 hover:text-primary"
      />
    </div>
  ) : (
    <div className="flex justify-between items-center">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/meal-planning/recipes">
            <BackArrow className="w-5 h-5 hover:text-primary" />
          </Link>
          <h1 className="text-2xl font-semibold">{currentName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Prep: {currentPrepMinutes}m</Badge>
          <Badge variant="outline">Cook: {currentCookMinutes}m</Badge>
          <Badge>Total: {currentPrepMinutes + currentCookMinutes}m</Badge>
        </div>
      </div>
      <EditGear
        onClick={() =>
          setShowUpdateRecipe((prevShowUpdateRecipe) => !prevShowUpdateRecipe)
        }
        className="w-5 h-5 hover:text-primary"
      />
    </div>
  );
}

export function DeleteRecipeForm({ id, recipeName }: { id: UUID; recipeName: string }) {
  const [state, formAction, pending] = useActionState(
    deleteRecipe,
    initialState,
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${recipeName}"? This will permanently remove the recipe, all its ingredients, and all instructions. This action cannot be undone.`,
    );
    if (!confirmed) {
      event.preventDefault();
    }
  };

  return (
    <div className="mt-8 pt-6 border-t border-destructive/20">
      <form action={formAction} onSubmit={handleSubmit} className="flex flex-col items-start gap-2">
        <input type="hidden" name="id" value={id} />
        <Button
          type="submit"
          variant="destructive"
          disabled={pending}
          className="w-full sm:w-auto"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {pending ? "Deleting..." : "Delete Recipe"}
        </Button>
        {!state.ok && <span className="text-red-600 text-sm">{state.error}</span>}
      </form>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INVENTORY COMBOBOX
// ─────────────────────────────────────────────────────────────────────────────

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
          className="w-[250px] justify-between"
        >
          {selected ? selected.name : "Select ingredient..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0">
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
                    className={`mr-2 h-4 w-4 ${
                      value === item.id ? "opacity-100" : "opacity-0"
                    }`}
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
// INGREDIENTS SECTION
// ─────────────────────────────────────────────────────────────────────────────

export function IngredientsSection({
  recipeId,
  ingredients,
  inventory,
  editMode,
}: {
  recipeId: UUID;
  ingredients: RecipeIngredient[];
  inventory: InventoryItem[];
  editMode: boolean;
}) {
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Clear highlight after 3 seconds
  useEffect(() => {
    if (highlightedId) {
      const timer = setTimeout(() => setHighlightedId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedId]);

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Ingredients</h2>

      {ingredients.length === 0 && !editMode ? (
        <p className="text-sm text-muted-foreground">No ingredients listed.</p>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-accent/20">
              <tr>
                <th className="w-1/3 text-left p-3">Ingredient</th>
                <th className="w-1/3 text-left p-3">Amount</th>
                <th className="w-1/6 text-right p-3">On Hand</th>
                <th className="w-1/6 text-right p-3">Remainder</th>
                {editMode && <th className="w-20 p-3"></th>}
              </tr>
            </thead>
            <tbody>
              {ingredients.map((ing) => (
                <IngredientRow
                  key={ing.id}
                  ingredient={ing}
                  recipeId={recipeId}
                  editMode={editMode}
                  isHighlighted={highlightedId === ing.inventory.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editMode && (
        <AddIngredientForm
          recipeId={recipeId}
          inventory={inventory}
          existingIngredients={ingredients}
          onDuplicateAttempt={setHighlightedId}
        />
      )}
    </div>
  );
}

function IngredientRow({
  ingredient: ing,
  recipeId,
  editMode,
  isHighlighted = false,
}: {
  ingredient: RecipeIngredient;
  recipeId: UUID;
  editMode: boolean;
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

  const handleDelete = (event: React.FormEvent<HTMLFormElement>) => {
    const confirmed = window.confirm(
      `Remove ${ing.inventory.name} from this recipe?`,
    );
    if (!confirmed) {
      event.preventDefault();
    }
  };

  if (isEditing && editMode) {
    return (
      <tr className="border-t">
        <td className="p-3 border-r">{ing.inventory.name}</td>
        <td colSpan={3} className="p-2">
          <form action={formAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={ing.id} />
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "..." : "Save"}
            </Button>
            <input type="hidden" name="recipe_id" value={recipeId} />
            <Input
              name="amount"
              type="number"
              step=".1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="w-20"
            />
            <input type="hidden" name="unit" value={unit} />
            <UnitSwitcher currentVal={unit} onValueChange={setUnit} size="sm" />
            {/* <Input
              name="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional)"
              className="flex-1"
            /> */}

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(false)}
            >
              <Cancel className="w-4 h-4" />
            </Button>
          </form>
          {!state.ok && (
            <span className="text-red-600 text-xs">{state.error}</span>
          )}
        </td>
        <td className="p-2">
          <form action={deleteFormAction} onSubmit={handleDelete}>
            <input type="hidden" name="id" value={ing.id} />
            <input type="hidden" name="recipe_id" value={recipeId} />
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="text-red-600"
              disabled={deletePending}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </form>
        </td>
      </tr>
    );
  }

  return (
    <tr
      className={`border-t ${remainder !== null && remainder < 0 ? "bg-red-200" : ""} ${
        isHighlighted ? "animate-pulse bg-yellow-100 dark:bg-yellow-900/30" : ""
      }`}
    >
      <td className="p-3 border-r">{ing.inventory.name}</td>
      <td className="text-left p-3">
        {ing.amount != null ? ing.amount : "—"}{" "}
        {ing.unit ?? ing.inventory.unit ?? ""}
      </td>
      <td className="text-right p-3">
        {ing.inventory.on_hand_qty} {ing.inventory.unit ?? ""}
      </td>
      <td
        className={`text-right p-3 border-l font-medium ${
          remainder !== null && remainder < 0
            ? "text-red-600"
            : remainder !== null && remainder > 0.5
              ? "text-green-600"
              : "text-yellow-600"
        }`}
      >
        {remainder !== null
          ? `${remainder} ${ing.inventory.unit ?? ""}`
          : "unit mismatch"}
      </td>
      {editMode && (
        <td className="p-2 text-center">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
        </td>
      )}
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
      // Reset form on success
      setSelectedId("");
      setUnit("");
      setWasPending(false);
    }
  }, [pending, state.ok, wasPending]);

  const handleSelect = (id: string, itemUnit: string | null) => {
    // Check if ingredient already exists in recipe
    const isDuplicate = existingIngredients.some(
      (ing) => ing.inventory.id === id
    );

    if (isDuplicate) {
      // Highlight existing ingredient and reset form
      onDuplicateAttempt(id);
      setSelectedId("");
      setUnit("");
      return;
    }

    setSelectedId(id);
    setUnit(itemUnit ?? "");
  };

  return (
    <form action={formAction} className="flex items-end gap-3 mt-4">
      <input type="hidden" name="recipe_id" value={recipeId} />
      <input type="hidden" name="inventory_id" value={selectedId} />
      <input type="hidden" name="unit" value={unit} />

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted-foreground">Ingredient</label>
        <InventoryCombobox
          inventory={inventory}
          value={selectedId}
          onSelect={handleSelect}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted-foreground">Amount</label>
        <Input name="amount" type="number" step="any" className="w-24" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted-foreground">Unit</label>
        <UnitSwitcher currentVal={unit} onValueChange={setUnit} size="sm" />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm text-muted-foreground">Note</label>
        <Input name="note" placeholder="optional" className="w-32" />
      </div>

      <Button type="submit" disabled={pending || !selectedId}>
        {pending ? "Adding..." : "Add Ingredient"}
      </Button>

      {!state.ok && <span className="text-red-600 text-sm">{state.error}</span>}
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INSTRUCTIONS SECTION
// ─────────────────────────────────────────────────────────────────────────────

export function InstructionsSection({
  recipeId,
  instructions,
  editMode,
}: {
  recipeId: UUID;
  instructions: Instruction[];
  editMode: boolean;
}) {
  const [items, setItems] = useState(instructions);
  const [isReordering, setIsReordering] = useState(false);

  // Sync with server data
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

    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const newItems = arrayMove(items, oldIndex, newIndex);

    // Update local state first
    setItems(newItems);

    // Then persist to server
    setIsReordering(true);
    reorderInstructions(
      recipeId,
      newItems.map((i) => i.id),
    ).finally(() => setIsReordering(false));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-semibold">Instructions</h2>
        {isReordering && (
          <span className="text-sm text-muted-foreground">Saving...</span>
        )}
      </div>

      {items.length === 0 && !editMode ? (
        <p className="text-sm text-muted-foreground">No instructions listed.</p>
      ) : editMode ? (
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
      ) : (
        <ol className="space-y-4">
          {items.map((step) => (
            <li key={step.id} className="flex gap-3">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
                {step.step_number}
              </span>
              <div className="flex-1 pt-1">
                <p>{step.text}</p>
                {step.detail && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {step.detail}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {editMode && <AddInstructionForm recipeId={recipeId} />}
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

  const handleDelete = (event: React.FormEvent<HTMLFormElement>) => {
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
        className="flex gap-3 p-3 border rounded-lg bg-background"
      >
        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
          {displayNumber}
        </span>
        <form action={formAction} className="flex-1 space-y-2">
          <input type="hidden" name="id" value={instruction.id} />
          <input type="hidden" name="recipe_id" value={recipeId} />
          <textarea
            name="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full border rounded p-2 text-sm"
            rows={2}
            required
          />
          <Input
            name="detail"
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="Detail (optional)"
          />
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
          {!state.ok && (
            <span className="text-red-600 text-xs">{state.error}</span>
          )}
        </form>
      </li>
    );
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex gap-3 p-3 border rounded-lg bg-background group"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-5 h-5 text-muted-foreground" />
      </button>
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
        {displayNumber}
      </span>
      <div className="flex-1 pt-1">
        <p>{instruction.text}</p>
        {instruction.detail && (
          <p className="text-sm text-muted-foreground mt-1">
            {instruction.detail}
          </p>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <form action={deleteFormAction} onSubmit={handleDelete}>
          <input type="hidden" name="id" value={instruction.id} />
          <input type="hidden" name="recipe_id" value={recipeId} />
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="text-red-600"
            disabled={deletePending}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </form>
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
    <form action={formAction} className="space-y-3 mt-4 p-4 border rounded-lg">
      <h3 className="font-medium">Add New Step</h3>
      <input type="hidden" name="recipe_id" value={recipeId} />
      <textarea
        name="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Instruction text..."
        className="w-full border rounded p-2 text-sm"
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
          <span className="text-red-600 text-sm">{state.error}</span>
        )}
      </div>
    </form>
  );
}
