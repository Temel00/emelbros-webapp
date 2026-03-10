"use client";

import {
  useActionState,
  useState,
  useEffect,
  useRef,
  useCallback,
  useTransition,
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
import {
  fetchVendorProductsForItem,
  upsertVendorProduct,
  deleteVendorProduct,
  fetchVendors,
  type VendorActionState,
  type VendorProductForItem,
  type Vendor,
} from "../../vendors/actions";
import { UnitSwitcher } from "@/components/unit-switcher";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { convertUnit } from "@/lib/unit-conversions";
import {
  Trash2,
  Loader,
  Plus,
  Lock,
  LockOpen,
  Croissant,
  Refrigerator,
  Snowflake,
  BadgeHelp,
  Store,
} from "lucide-react";

const initialState: InventoryActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Icon Constants
// ─────────────────────────────────────────────────────────────────────────────

const LOCATION_ICONS = {
  pantry: { icon: Croissant, label: "Pantry" },
  fridge: { icon: Refrigerator, label: "Fridge" },
  freezer: { icon: Snowflake, label: "Freezer" },
  other: { icon: BadgeHelp, label: "Other" },
} as const;

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
                <button
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
                </button>
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
// Vendor Products Section (shown in edit mode)
// ─────────────────────────────────────────────────────────────────────────────

const vendorProductInitialState: VendorActionState = { ok: true };

function VendorProductRow({
  vp,
  onDeleted,
}: {
  vp: VendorProductForItem;
  onDeleted: () => void;
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    upsertVendorProduct,
    vendorProductInitialState,
  );
  const [isDeleting, setIsDeleting] = useState(false);
  const hasSubmitted = useRef(false);
  const onDeletedRef = useRef(onDeleted);
  onDeletedRef.current = onDeleted;

  useEffect(() => {
    if (pending) {
      hasSubmitted.current = true;
    } else if (hasSubmitted.current) {
      hasSubmitted.current = false;
      if (state.ok) setEditOpen(false);
    }
  }, [pending, state]);

  const handleDelete = async () => {
    setIsDeleting(true);
    const fd = new FormData();
    fd.append("id", vp.id);
    const result = await deleteVendorProduct(vendorProductInitialState, fd);
    setIsDeleting(false);
    if (result.ok) {
      setEditOpen(false);
      onDeletedRef.current();
    }
  };

  return (
    <>
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-accent/10 transition-colors text-xs cursor-pointer"
        onClick={() => setEditOpen(true)}
      >
        <Store className="w-3 h-3 text-muted-foreground flex-shrink-0" />
        <span className="font-medium">{vp.vendor?.name ?? "Unknown"}</span>
        {vp.upc && (
          <span className="text-muted-foreground font-mono truncate">
            {vp.upc}
          </span>
        )}
        {vp.pack_size && (
          <span className="text-muted-foreground ml-auto whitespace-nowrap">
            {vp.pack_size} {vp.pack_unit}
          </span>
        )}
        {!vp.upc && !vp.pack_size && (
          <span className="text-muted-foreground italic">No UPC set</span>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md border border-foreground">
          <DialogHeader>
            <DialogTitle>
              Edit {vp.vendor?.name} Product
            </DialogTitle>
            <DialogDescription>
              Update vendor-specific product details.
            </DialogDescription>
          </DialogHeader>

          <form id="vp-edit-form" action={formAction} className="grid gap-4">
            <Input type="hidden" name="id" value={vp.id} />
            <Input type="hidden" name="vendor_id" value={vp.vendor_id} />
            <Input type="hidden" name="inventory_id" value={vp.inventory_id} />

            <div className="grid gap-2">
              <label htmlFor={`vp-upc-${vp.id}`} className="text-sm font-medium">
                UPC Code
              </label>
              <Input
                id={`vp-upc-${vp.id}`}
                name="upc"
                placeholder="e.g., 0001111042342"
                defaultValue={vp.upc ?? ""}
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor={`vp-pname-${vp.id}`} className="text-sm font-medium">
                Product Name
              </label>
              <Input
                id={`vp-pname-${vp.id}`}
                name="product_name"
                placeholder="e.g., Kroger Chicken Breast 3lb"
                defaultValue={vp.product_name ?? ""}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor={`vp-psize-${vp.id}`} className="text-sm font-medium">
                  Pack Size
                </label>
                <Input
                  id={`vp-psize-${vp.id}`}
                  name="pack_size"
                  type="number"
                  step={0.1}
                  min={0}
                  placeholder="e.g., 3"
                  defaultValue={vp.pack_size ?? ""}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Pack Unit</label>
                <UnitSwitcher
                  currentVal={vp.pack_unit ?? "lb"}
                  name="pack_unit"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor={`vp-notes-${vp.id}`} className="text-sm font-medium">
                Notes
              </label>
              <Input
                id={`vp-notes-${vp.id}`}
                name="notes"
                placeholder="Optional notes"
                defaultValue={vp.notes ?? ""}
              />
            </div>

            {!state.ok && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}
          </form>

          <DialogFooter className="sm:justify-between">
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
            </Button>
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                type="submit"
                form="vp-edit-form"
                disabled={pending || isDeleting}
              >
                {pending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function VendorProductsSection({ inventoryId }: { inventoryId: string }) {
  const [vendorProducts, setVendorProducts] = useState<VendorProductForItem[]>(
    [],
  );
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addState, addFormAction, addPending] = useActionState(
    upsertVendorProduct,
    vendorProductInitialState,
  );
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const addHasSubmitted = useRef(false);

  const loadData = useCallback(async () => {
    const [vpData, vendorData] = await Promise.all([
      fetchVendorProductsForItem(inventoryId),
      fetchVendors(),
    ]);
    setVendorProducts(vpData);
    setVendors(vendorData.vendors);
    setLoading(false);
  }, [inventoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle add form success
  useEffect(() => {
    if (addPending) {
      addHasSubmitted.current = true;
    } else if (addHasSubmitted.current) {
      addHasSubmitted.current = false;
      if (addState.ok) {
        setAddOpen(false);
        loadData();
      }
    }
  }, [addPending, addState, loadData]);

  // Default to first vendor not already mapped
  useEffect(() => {
    if (addOpen && vendors.length > 0) {
      const mappedVendorIds = new Set(vendorProducts.map((vp) => vp.vendor_id));
      const unmapped = vendors.find((v) => !mappedVendorIds.has(v.id));
      setSelectedVendorId(unmapped?.id ?? vendors[0].id);
    }
  }, [addOpen, vendors, vendorProducts]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
        <Loader className="w-3 h-3 animate-spin" />
        Loading vendor info...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Vendor Products</label>
        {vendors.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3 h-3" />
            Add
          </Button>
        )}
      </div>

      {vendorProducts.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No vendor products mapped.
          {vendors.length === 0 && " Add vendors in Food → Vendors first."}
        </p>
      ) : (
        <div className="rounded-md border divide-y">
          {vendorProducts.map((vp) => (
            <VendorProductRow
              key={vp.id}
              vp={vp}
              onDeleted={loadData}
            />
          ))}
        </div>
      )}

      {/* Add vendor product inline dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md border border-foreground">
          <DialogHeader>
            <DialogTitle>Add Vendor Product</DialogTitle>
            <DialogDescription>
              Map this item to a vendor-specific product.
            </DialogDescription>
          </DialogHeader>

          <form id="vp-add-form" action={addFormAction} className="grid gap-4">
            <Input type="hidden" name="inventory_id" value={inventoryId} />
            <Input type="hidden" name="vendor_id" value={selectedVendorId} />

            <div className="grid gap-2">
              <label className="text-sm font-medium">Vendor</label>
              <div className="flex flex-wrap gap-1">
                {vendors.map((v) => (
                  <Button
                    key={v.id}
                    type="button"
                    variant={v.id === selectedVendorId ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedVendorId(v.id)}
                  >
                    <Store className="w-3 h-3" />
                    {v.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="vp-add-upc" className="text-sm font-medium">
                UPC Code
              </label>
              <Input
                id="vp-add-upc"
                name="upc"
                placeholder="e.g., 0001111042342"
              />
            </div>

            <div className="grid gap-2">
              <label htmlFor="vp-add-pname" className="text-sm font-medium">
                Product Name
              </label>
              <Input
                id="vp-add-pname"
                name="product_name"
                placeholder="e.g., Kroger Chicken Breast 3lb"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <label htmlFor="vp-add-psize" className="text-sm font-medium">
                  Pack Size
                </label>
                <Input
                  id="vp-add-psize"
                  name="pack_size"
                  type="number"
                  step={0.1}
                  min={0}
                  placeholder="e.g., 3"
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">Pack Unit</label>
                <UnitSwitcher currentVal="lb" name="pack_unit" />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="vp-add-notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="vp-add-notes"
                name="notes"
                placeholder="Optional notes"
              />
            </div>

            {!addState.ok && (
              <p className="text-sm text-destructive">{addState.error}</p>
            )}
          </form>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              type="submit"
              form="vp-add-form"
              disabled={addPending}
            >
              {addPending ? "Saving..." : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
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
  const [location, setLocation] = useState<InventoryItem["location"]>(
    item?.location ?? null,
  );
  const [quantity, setQuantity] = useState<string>(
    item?.on_hand_qty != null ? String(item.on_hand_qty) : "",
  );
  const [unit, setUnit] = useState(item?.unit ?? "g");
  const [lockValue, setLockValue] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const handleUnitChange = (newUnit: string) => {
    if (!lockValue && quantity) {
      const converted = convertUnit(Number(quantity), unit, newUnit);
      if (converted !== null) {
        // Format: remove trailing zeros, max 4 decimal places
        setQuantity(String(parseFloat(converted.toFixed(4))));
      }
    }
    setUnit(newUnit);
  };

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
        <Input type="hidden" name="location" value={location ?? ""} />
        <Input type="hidden" name="unit" value={unit} />

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

        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <label htmlFor="quantity" className="text-sm font-medium">
              Quantity
            </label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => setLockValue((v) => !v)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs transition-colors",
                      lockValue
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {lockValue ? (
                      <Lock className="w-3 h-3" />
                    ) : (
                      <LockOpen className="w-3 h-3" />
                    )}
                    {lockValue ? "Locked" : "Convert"}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    {lockValue
                      ? "Value stays the same when changing units"
                      : "Value auto-converts when changing units"}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              id="quantity"
              name="quantity"
              type="number"
              step="any"
              min={0}
              placeholder="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
            <UnitSwitcher
              currentVal={unit}
              onValueChange={handleUnitChange}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">Location</label>
          <IconToggle
            options={LOCATION_OPTIONS}
            value={location}
            onChange={setLocation}
          />
        </div>

        {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}
      </form>

      {/* Vendor products section — only shown in edit mode */}
      {mode === "edit" && item && (
        <VendorProductsSection inventoryId={item.id} />
      )}

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
      <div className="rounded-lg border-split-gradient">
        <div
          className="flex h-6 md:h-10 items-center px-4 rounded-lg gap-2 text-xs md:text-lg hover:bg-primary/10"
          onClick={handleRowClick}
        >
          {item.location && LOCATION_ICONS[item.location] && (
            <IconWithTooltip
              icon={LOCATION_ICONS[item.location].icon}
              label={LOCATION_ICONS[item.location].label}
            />
          )}
          <p className="flex-1">{item.name}</p>
          <p className="w-8 text-right">
            {typeof item.on_hand_qty === "number"
              ? `${item.on_hand_qty}`
              : null}
          </p>
          <p className="w-8">{item.unit}</p>
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
