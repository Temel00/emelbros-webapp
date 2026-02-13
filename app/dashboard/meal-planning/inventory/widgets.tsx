"use client";

import {
  useActionState,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  addInventoryItem,
  updateInventoryItem,
  deleteInventoryItem,
  fetchInventoryItems,
  type InventoryActionState,
  type InventoryItem,
} from "./actions";
import { UnitSwitcher } from "@/components/unit-switcher";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
// import { EditGear } from "@/components/ui/edit-gear";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Trash2,
  Loader,
  Plus,
  Weight,
  FlaskConical,
  Dice1,
  Croissant,
  Refrigerator,
  Snowflake,
  BadgeHelp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const initialState: InventoryActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Icon Constants
// ─────────────────────────────────────────────────────────────────────────────

const UNIT_CATEGORY_ICONS = {
  weight: { icon: Weight, label: "Weight" },
  volume: { icon: FlaskConical, label: "Volume" },
  count: { icon: Dice1, label: "Count" },
} as const;

const LOCATION_ICONS = {
  pantry: { icon: Croissant, label: "Pantry" },
  fridge: { icon: Refrigerator, label: "Fridge" },
  freezer: { icon: Snowflake, label: "Freezer" },
  other: { icon: BadgeHelp, label: "Other" },
} as const;

const UNIT_CATEGORY_OPTIONS = [
  { value: "weight" as const, icon: Weight, label: "Weight" },
  { value: "volume" as const, icon: FlaskConical, label: "Volume" },
  { value: "count" as const, icon: Dice1, label: "Count" },
];

const LOCATION_OPTIONS = [
  { value: "pantry" as const, icon: Croissant, label: "Pantry" },
  { value: "fridge" as const, icon: Refrigerator, label: "Fridge" },
  { value: "freezer" as const, icon: Snowflake, label: "Freezer" },
  { value: "other" as const, icon: BadgeHelp, label: "Other" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────────────────────

function IconWithTooltip({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Icon className="w-3 md:w-4 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function IconToggle<T extends string>({
  options,
  value,
  onChange,
}: {
  options: {
    value: T;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
  }[];
  value: T | null;
  onChange: (value: T | null) => void;
}) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => {
          const Icon = opt.icon;
          const isSelected = value === opt.value;
          return (
            <Tooltip key={opt.value}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  onClick={() => onChange(isSelected ? null : opt.value)}
                  className={cn(
                    "inline-flex items-center justify-center rounded-md border p-1.5 transition-colors",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent",
                  )}
                >
                  <Icon className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{opt.label}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Item Dialog (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────

function InventoryFormContent({
  mode,
  item,
  onSuccess,
  onDelete,
}: {
  mode: "add" | "edit";
  item?: InventoryItem;
  onSuccess: (itemName?: string) => void;
  onDelete?: (itemName: string) => void;
}) {
  const action = mode === "add" ? addInventoryItem : updateInventoryItem;
  const [state, formAction, pending] = useActionState(action, initialState);
  const nameRef = useRef<HTMLInputElement>(null);
  const hasSubmitted = useRef(false);
  const submittedNameRef = useRef<string>("");
  const [unitCategory, setUnitCategory] = useState<
    InventoryItem["unit_category"]
  >(item?.unit_category ?? null);
  const [location, setLocation] = useState<InventoryItem["location"]>(
    item?.location ?? null,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  // Wrap formAction to capture the submitted name
  const wrappedFormAction = (formData: FormData) => {
    const name = String(formData.get("name") || "").trim();
    submittedNameRef.current = name;
    return formAction(formData);
  };

  // Close dialog on successful save
  useEffect(() => {
    if (pending) {
      hasSubmitted.current = true;
    } else if (hasSubmitted.current) {
      hasSubmitted.current = false;
      if (state.ok) {
        onSuccessRef.current(submittedNameRef.current);
      }
    }
  }, [pending, state]);

  const handleDelete = async () => {
    if (!item) return;
    const confirmed = window.confirm(
      "Are you sure you want to delete this item?",
    );
    if (!confirmed) return;
    setIsDeleting(true);
    const fd = new FormData();
    fd.append("id", item.id);
    const result = await deleteInventoryItem(initialState, fd);
    setIsDeleting(false);
    if (result.ok) {
      onSuccessRef.current();
      onDeleteRef.current?.(item.name);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "add" ? "Add Item" : "Edit Item"}</DialogTitle>
        <DialogDescription>
          {mode === "add"
            ? "Add a new ingredient to your inventory."
            : `Edit details for ${item?.name}.`}
        </DialogDescription>
      </DialogHeader>

      <form
        id="inventory-form"
        action={wrappedFormAction}
        className="grid gap-4"
      >
        {mode === "edit" && item && (
          <Input type="hidden" name="id" value={item.id} />
        )}
        <Input type="hidden" name="unit_category" value={unitCategory ?? ""} />
        <Input type="hidden" name="location" value={location ?? ""} />

        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            ref={nameRef}
            id="name"
            name="name"
            placeholder="Ingredient name"
            defaultValue={item?.name ?? ""}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity
            </label>
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step={0.1}
              min={0}
              placeholder="0"
              defaultValue={item?.on_hand_qty ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Unit</label>
            <UnitSwitcher currentVal={item?.unit ?? "g"} name="unit" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Category</label>
            <IconToggle
              options={UNIT_CATEGORY_OPTIONS}
              value={unitCategory}
              onChange={setUnitCategory}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Location</label>
            <IconToggle
              options={LOCATION_OPTIONS}
              value={location}
              onChange={setLocation}
            />
          </div>
        </div>

        {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      </form>

      <DialogFooter className={cn(mode === "edit" && "sm:justify-between")}>
        {mode === "edit" && item && (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting || pending}
          >
            {isDeleting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Delete
          </Button>
        )}
        <div className="flex gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            form="inventory-form"
            disabled={pending || isDeleting}
          >
            {pending ? "Saving..." : mode === "add" ? "Add" : "Save"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function InventoryItemDialog({
  mode,
  item,
  open,
  onOpenChange,
  onItemSaved,
  onItemDeleted,
}: {
  mode: "add" | "edit";
  item?: InventoryItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemSaved?: (name: string) => void;
  onItemDeleted?: (name: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-foreground">
        <InventoryFormContent
          mode={mode}
          item={item}
          onSuccess={(itemName) => {
            console.log(`onSuccess: ${itemName}`);
            onOpenChange(false);
            if (itemName) onItemSaved?.(itemName);
          }}
          onDelete={(itemName) => {
            onOpenChange(false);
            onItemDeleted?.(itemName);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Item Dialog & Success Messages
// ─────────────────────────────────────────────────────────────────────────────

export function AddItemDialog() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const successMessage = searchParams.get("success");

  // Clear success message after 3 seconds
  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("success");
      router.replace(`${pathname}?${params.toString()}`);
    }, 3000);
    return () => clearTimeout(timer);
  }, [successMessage, searchParams, router, pathname]);

  const handleItemSaved = (name: string) => {
    console.log("triggered handleItemSaved");
    const params = new URLSearchParams(searchParams.toString());
    params.set("success", `${name} added!`);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        Add Item
      </Button>
      {successMessage && (
        <p className="text-sm text-tertiary animate-in fade-in duration-300">
          {successMessage}
        </p>
      )}
      <InventoryItemDialog
        mode="add"
        open={open}
        onOpenChange={setOpen}
        onItemSaved={handleItemSaved}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inventory Item Row (Display + Edit Dialog)
// ─────────────────────────────────────────────────────────────────────────────

export function InventoryItemRow({ item }: { item: InventoryItem }) {
  const [editOpen, setEditOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const handleItemDeleted = (name: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("success", `${name} deleted!`);
    router.push(`${pathname}?${params.toString()}`);
  };

  const handleRowClick = () => {
    setEditOpen(true);
  };

  return (
    <>
      <div
        className="bg-gradient-to-r from-background from-5% via-card via-50% to-background to-95% cursor-pointer py-[.5px] hover:bg-none"
        onClick={handleRowClick}
      >
        <div className="flex h-6 md:h-10 items-center gap-3 text-xs md:text-lg bg-background hover:bg-primary/10 px-2 rounded-lg">
          <div className="w-5 flex justify-center">
            {item.location && LOCATION_ICONS[item.location] && (
              <IconWithTooltip
                icon={LOCATION_ICONS[item.location].icon}
                label={LOCATION_ICONS[item.location].label}
              />
            )}
          </div>
          <p className="flex-1">{item.name}</p>
          <p className="w-8 text-right">
            {typeof item.on_hand_qty === "number"
              ? `${item.on_hand_qty}`
              : null}
          </p>
          <p className="w-8">{item.unit}</p>
          <div className="w-5 justify-center">
            {item.unit_category && UNIT_CATEGORY_ICONS[item.unit_category] && (
              <IconWithTooltip
                icon={UNIT_CATEGORY_ICONS[item.unit_category].icon}
                label={UNIT_CATEGORY_ICONS[item.unit_category].label}
              />
            )}
          </div>
          {/* <EditGear
          onClick={() => setEditOpen(true)}
          className="w-3 md:w-4 hover:text-primary"
        /> */}
        </div>
      </div>
      <InventoryItemDialog
        mode="edit"
        item={item}
        open={editOpen}
        onOpenChange={setEditOpen}
        onItemDeleted={handleItemDeleted}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Search and Filter Components
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "weight", label: "Weight" },
  { value: "volume", label: "Volume" },
  { value: "count", label: "Count" },
] as const;

export function InventorySearchFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
  const category = searchParams.get("category") ?? "all";

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (searchValue) {
        params.set("q", searchValue);
      } else {
        params.delete("q");
      }
      router.push(`${pathname}?${params.toString()}`);
    }, 300);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const handleCategoryChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value !== "all") {
      params.set("category", value);
    } else {
      params.delete("category");
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex gap-4 items-center">
      <Input
        placeholder="Search by name..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="max-w-sm"
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">
            {CATEGORIES.find((c) => c.value === category)?.label}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={category}
            onValueChange={handleCategoryChange}
          >
            {CATEGORIES.map((cat) => (
              <DropdownMenuRadioItem key={cat.value} value={cat.value}>
                {cat.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Infinite Scroll
// ─────────────────────────────────────────────────────────────────────────────

export function InfiniteInventoryList({
  initialItems,
  initialHasMore,
  totalItems: initialTotal,
  search,
  category,
  itemsPerLoad,
}: {
  initialItems: InventoryItem[];
  initialHasMore: boolean;
  totalItems: number;
  search: string;
  category: string;
  itemsPerLoad: number;
}) {
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(initialTotal);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const currentLoad = useRef(1);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(initialHasMore);

  // Reset when server re-renders with new initial data (search/filter change)
  useEffect(() => {
    setItems(initialItems);
    currentLoad.current = 1;
    setHasMore(initialHasMore);
    hasMoreRef.current = initialHasMore;
    setIsLoading(false);
    isLoadingRef.current = false;
    setTotalItems(initialTotal);
  }, [initialItems, initialHasMore, initialTotal]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const nextLoad = currentLoad.current + 1;
      const result = await fetchInventoryItems(
        nextLoad,
        search,
        category,
        itemsPerLoad,
      );
      setItems((prev) => [...prev, ...result.items]);
      currentLoad.current = nextLoad;
      setHasMore(result.hasMore);
      hasMoreRef.current = result.hasMore;
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error("Failed to load more items:", error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [search, category, itemsPerLoad]);

  // Intersection Observer — triggers loadMore when sentinel enters viewport
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div>
      {items.map((item) => (
        <InventoryItemRow key={item.id} item={item} />
      ))}

      {/* Sentinel element — triggers loading when scrolled into view */}
      <div ref={sentinelRef} className="h-1" />

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Showing all {totalItems} items
        </p>
      )}
    </div>
  );
}
