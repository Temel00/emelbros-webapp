"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, Clock, Loader, Trash2, CalendarDays, ShoppingCart } from "lucide-react";

import {
  addMealPlan,
  updateMealPlan,
  deleteMealPlan,
  type MealPlan,
  type MealPlanRecipe,
} from "./actions";
import { generateShoppingList } from "../shopping-list/actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getCalendarDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateString(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function isToday(year: number, month: number, day: number): boolean {
  const now = new Date();
  return now.getFullYear() === year && now.getMonth() + 1 === month && now.getDate() === day;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dialog state types
// ─────────────────────────────────────────────────────────────────────────────

type DialogState =
  | { mode: "closed" }
  | { mode: "add"; date: string }
  | { mode: "edit"; mealPlan: MealPlan };

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────────────────────

function MealPill({
  mealPlan,
  onClick,
}: {
  mealPlan: MealPlan;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="w-full text-left px-1.5 py-0.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors text-xs leading-tight group"
    >
      <p className="font-medium text-primary truncate">{mealPlan.recipe.name}</p>
      {mealPlan.cook_time && (
        <p className="text-muted-foreground flex items-center gap-0.5">
          <Clock className="w-2.5 h-2.5" />
          {formatTime(mealPlan.cook_time)}
        </p>
      )}
    </button>
  );
}

function DayCell({
  day,
  year,
  month,
  mealPlans,
  onAddClick,
  onMealClick,
}: {
  day: number | null;
  year: number;
  month: number;
  mealPlans: MealPlan[];
  onAddClick: (date: string) => void;
  onMealClick: (mealPlan: MealPlan) => void;
}) {
  if (day === null) {
    return <div className="bg-muted/20 rounded-lg min-h-20 md:min-h-24" />;
  }

  const today = isToday(year, month, day);
  const dateStr = toDateString(year, month, day);
  const dayMeals = mealPlans.filter((mp) => mp.scheduled_date === dateStr);

  return (
    <div
      className={cn(
        "rounded-lg border min-h-20 md:min-h-24 p-1 flex flex-col gap-1 cursor-pointer group transition-colors",
        today
          ? "border-primary bg-primary/5"
          : "border-border hover:border-primary/40 hover:bg-accent/5",
      )}
      onClick={() => onAddClick(dateStr)}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "text-xs font-medium w-5 h-5 flex items-center justify-center rounded-full",
            today
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground",
          )}
        >
          {day}
        </span>
        <Plus className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex flex-col gap-0.5 overflow-hidden">
        {dayMeals.map((mp) => (
          <MealPill key={mp.id} mealPlan={mp} onClick={() => onMealClick(mp)} />
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Recipe Picker
// ─────────────────────────────────────────────────────────────────────────────

function RecipePicker({
  recipes,
  value,
  onChange,
}: {
  recipes: MealPlanRecipe[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = recipes.find((r) => r.id === value);

  return (
    <>
      <Input type="hidden" name="recipe_id" value={value} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            className="w-full justify-start font-normal"
          >
            {selected ? selected.name : "Select a recipe..."}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search recipes..." />
            <CommandList>
              <CommandEmpty>No recipes found.</CommandEmpty>
              <CommandGroup>
                {recipes.map((recipe) => (
                  <CommandItem
                    key={recipe.id}
                    value={recipe.name}
                    onSelect={() => {
                      onChange(recipe.id);
                      setOpen(false);
                    }}
                  >
                    <span className="flex-1">{recipe.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {recipe.total_minutes}m
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meal Dialog (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────

function MealDialog({
  dialogState,
  recipes,
  onClose,
}: {
  dialogState: DialogState;
  recipes: MealPlanRecipe[];
  onClose: () => void;
}) {
  const isEdit = dialogState.mode === "edit";
  const isAdd = dialogState.mode === "add";
  const open = isAdd || isEdit;

  const existing = isEdit ? dialogState.mealPlan : null;
  const initialDate = isAdd ? dialogState.date : existing?.scheduled_date ?? "";

  const [recipeId, setRecipeId] = useState(existing?.recipe_id ?? "");
  const [date, setDate] = useState(initialDate);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Reset state when dialog opens with new data
  useEffect(() => {
    if (open) {
      setRecipeId(existing?.recipe_id ?? "");
      setDate(isAdd ? dialogState.date : existing?.scheduled_date ?? "");
      setError(null);
      setDeleteConfirm(false);
    }
  }, [open, dialogState.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = isEdit
        ? await updateMealPlan(formData)
        : await addMealPlan(formData);
      if (!result.ok) {
        setError(result.error ?? "Something went wrong");
      } else {
        onClose();
      }
    });
  }

  function handleDelete() {
    if (!existing) return;
    startTransition(async () => {
      const result = await deleteMealPlan(existing.id);
      if (!result.ok) {
        setError(result.error ?? "Failed to delete");
      } else {
        onClose();
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Meal" : "Add Meal"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this scheduled meal." : "Schedule a recipe for this day."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEdit && (
            <Input type="hidden" name="id" value={existing?.id ?? ""} />
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Recipe</label>
            <RecipePicker recipes={recipes} value={recipeId} onChange={setRecipeId} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="scheduled_date" className="text-sm font-medium">
                Date
              </label>
              <Input
                id="scheduled_date"
                name="scheduled_date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="cook_time" className="text-sm font-medium">
                Start Cooking
              </label>
              <Input
                id="cook_time"
                name="cook_time"
                type="time"
                defaultValue={existing?.cook_time ?? ""}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="notes" className="text-sm font-medium">
              Notes
            </label>
            <Input
              id="notes"
              name="notes"
              placeholder="Optional notes..."
              defaultValue={existing?.notes ?? ""}
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-between gap-2">
            <div>
              {isEdit && !deleteConfirm && (
                <Button
                  type="button"
                  variant="iconDestructive"
                  size="icon"
                  onClick={() => setDeleteConfirm(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              {isEdit && deleteConfirm && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive">Remove meal?</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending}
                    onClick={handleDelete}
                  >
                    {isPending ? <Loader className="w-4 h-4 animate-spin" /> : "Remove"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending || !recipeId || !date}>
                {isPending ? <Loader className="w-4 h-4 animate-spin" /> : isEdit ? "Save" : "Add"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shopping List Dialog
// ─────────────────────────────────────────────────────────────────────────────

function ShoppingListDialog({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await generateShoppingList({ ok: true }, formData);
      if (!result.ok) {
        setError(result.error ?? "Failed to generate shopping list");
      } else {
        setOpen(false);
        router.push("/dashboard/food/shopping-list");
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <ShoppingCart className="w-4 h-4" />
        Shopping List
      </Button>
      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate Shopping List</DialogTitle>
            <DialogDescription>
              Choose a date range to build a shopping list from your planned meals.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="sl_start" className="text-sm font-medium">
                  From
                </label>
                <Input
                  id="sl_start"
                  name="start_date"
                  type="date"
                  defaultValue={firstDay}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="sl_end" className="text-sm font-medium">
                  To
                </label>
                <Input
                  id="sl_end"
                  name="end_date"
                  type="date"
                  defaultValue={lastDay}
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  "Generate"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function MealPlanningCalendar({
  initialMealPlans,
  recipes,
  year,
  month,
}: {
  initialMealPlans: MealPlan[];
  recipes: MealPlanRecipe[];
  year: number;
  month: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [dialogState, setDialogState] = useState<DialogState>({ mode: "closed" });

  const calendarDays = getCalendarDays(year, month);

  function navigateMonth(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) { newMonth = 1; newYear++; }
    if (newMonth < 1) { newMonth = 12; newYear--; }
    router.push(`${pathname}?year=${newYear}&month=${newMonth}`);
  }

  function goToToday() {
    const now = new Date();
    router.push(`${pathname}?year=${now.getFullYear()}&month=${now.getMonth() + 1}`);
  }

  const todayYear = new Date().getFullYear();
  const todayMonth = new Date().getMonth() + 1;
  const isCurrentMonth = year === todayYear && month === todayMonth;

  return (
    <div className="space-y-4">
      {/* Calendar header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {MONTH_NAMES[month - 1]} {year}
          </h2>
          {!isCurrentMonth && (
            <Button variant="outline" size="sm" onClick={goToToday}>
              Today
            </Button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <ShoppingListDialog year={year} month={month} />
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth(-1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Previous month</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigateMonth(1)}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Next month</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Hint */}
      {recipes.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No recipes yet. Add some recipes before planning meals.</p>
        </div>
      ) : (
        <>
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 gap-1">
            {DAY_NAMES.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-medium text-muted-foreground py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, i) => (
              <DayCell
                key={i}
                day={day}
                year={year}
                month={month}
                mealPlans={initialMealPlans}
                onAddClick={(date) => setDialogState({ mode: "add", date })}
                onMealClick={(mp) => setDialogState({ mode: "edit", mealPlan: mp })}
              />
            ))}
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Click a day to schedule a meal
          </p>
        </>
      )}

      <MealDialog
        dialogState={dialogState}
        recipes={recipes}
        onClose={() => setDialogState({ mode: "closed" })}
      />
    </div>
  );
}
