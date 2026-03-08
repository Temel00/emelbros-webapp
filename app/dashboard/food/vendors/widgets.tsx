"use client";

import {
  useActionState,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  addVendor,
  updateVendor,
  deleteVendor,
  upsertVendorProduct,
  deleteVendorProduct,
  fetchVendorProducts,
  type VendorActionState,
  type Vendor,
  type VendorProductWithInventory,
} from "./actions";
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
import { cn } from "@/lib/utils";
import {
  Trash2,
  Loader,
  Plus,
  Store,
  Pencil,
  Package,
  Barcode,
  Check,
  ChevronsUpDown,
} from "lucide-react";

const initialState: VendorActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Management (Add / Edit / Delete)
// ─────────────────────────────────────────────────────────────────────────────

function VendorFormContent({
  mode,
  vendor,
  onSuccess,
  onDelete,
}: {
  mode: "add" | "edit";
  vendor?: Vendor;
  onSuccess: () => void;
  onDelete?: () => void;
}) {
  const action = mode === "add" ? addVendor : updateVendor;
  const [state, formAction, pending] = useActionState(action, initialState);
  const hasSubmitted = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  useEffect(() => {
    if (pending) {
      hasSubmitted.current = true;
    } else if (hasSubmitted.current) {
      hasSubmitted.current = false;
      if (state.ok) onSuccessRef.current();
    }
  }, [pending, state]);

  const handleDelete = async () => {
    if (!vendor) return;
    const confirmed = window.confirm(
      `Delete "${vendor.name}"? This will also remove all product mappings for this vendor.`,
    );
    if (!confirmed) return;
    setIsDeleting(true);
    const fd = new FormData();
    fd.append("id", vendor.id);
    const result = await deleteVendor(initialState, fd);
    setIsDeleting(false);
    if (result.ok) onDeleteRef.current?.();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {mode === "add" ? "Add Vendor" : "Edit Vendor"}
        </DialogTitle>
        <DialogDescription>
          {mode === "add"
            ? "Add a new store or vendor."
            : `Edit details for ${vendor?.name}.`}
        </DialogDescription>
      </DialogHeader>

      <form id="vendor-form" action={formAction} className="grid gap-4">
        {mode === "edit" && vendor && (
          <Input type="hidden" name="id" value={vendor.id} />
        )}
        <div className="grid gap-2">
          <label htmlFor="vendor-name" className="text-sm font-medium">
            Name
          </label>
          <Input
            id="vendor-name"
            name="name"
            placeholder="e.g., Kroger, Costco"
            defaultValue={vendor?.name ?? ""}
            required
          />
        </div>

        {!state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </form>

      <DialogFooter className={cn(mode === "edit" && "sm:justify-between")}>
        {mode === "edit" && vendor && (
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
            form="vendor-form"
            disabled={pending || isDeleting}
          >
            {pending ? "Saving..." : mode === "add" ? "Add" : "Save"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Product Form (Add / Edit UPC mapping)
// ─────────────────────────────────────────────────────────────────────────────

function VendorProductFormContent({
  vendorId,
  product,
  inventoryItems,
  onSuccess,
  onDelete,
}: {
  vendorId: string;
  product?: VendorProductWithInventory;
  inventoryItems: { id: string; name: string; unit: string }[];
  onSuccess: () => void;
  onDelete?: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    upsertVendorProduct,
    initialState,
  );
  const hasSubmitted = useRef(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState(
    product?.inventory_id ?? "",
  );
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const isEdit = !!product;
  const selectedItem = inventoryItems.find((i) => i.id === selectedInventoryId);

  useEffect(() => {
    if (pending) {
      hasSubmitted.current = true;
    } else if (hasSubmitted.current) {
      hasSubmitted.current = false;
      if (state.ok) onSuccessRef.current();
    }
  }, [pending, state]);

  const handleDelete = async () => {
    if (!product) return;
    const confirmed = window.confirm("Remove this product mapping?");
    if (!confirmed) return;
    setIsDeleting(true);
    const fd = new FormData();
    fd.append("id", product.id);
    const result = await deleteVendorProduct(initialState, fd);
    setIsDeleting(false);
    if (result.ok) onDeleteRef.current?.();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {isEdit ? "Edit Product Mapping" : "Add Product Mapping"}
        </DialogTitle>
        <DialogDescription>
          {isEdit
            ? `Edit vendor details for ${product.inventory?.name ?? "this item"}.`
            : "Map an inventory item to a vendor product."}
        </DialogDescription>
      </DialogHeader>

      <form id="vendor-product-form" action={formAction} className="grid gap-4">
        {isEdit && <Input type="hidden" name="id" value={product.id} />}
        <Input type="hidden" name="vendor_id" value={vendorId} />
        <Input type="hidden" name="inventory_id" value={selectedInventoryId} />

        {/* Inventory item selector */}
        <div className="grid gap-2">
          <label className="text-sm font-medium">Inventory Item</label>
          {isEdit ? (
            <p className="text-sm text-muted-foreground">
              {product.inventory?.name ?? "Unknown"}
            </p>
          ) : (
            <Popover open={inventoryOpen} onOpenChange={setInventoryOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="justify-between"
                >
                  {selectedItem?.name ?? "Select item..."}
                  <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search inventory..." />
                  <CommandList>
                    <CommandEmpty>No items found.</CommandEmpty>
                    <CommandGroup>
                      {inventoryItems.map((item) => (
                        <CommandItem
                          key={item.id}
                          value={item.name}
                          onSelect={() => {
                            setSelectedInventoryId(item.id);
                            setInventoryOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "w-4 h-4 mr-2",
                              selectedInventoryId === item.id
                                ? "opacity-100"
                                : "opacity-0",
                            )}
                          />
                          {item.name}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {item.unit}
                          </span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* UPC */}
        <div className="grid gap-2">
          <label htmlFor="upc" className="text-sm font-medium">
            UPC Code
          </label>
          <Input
            id="upc"
            name="upc"
            placeholder="e.g., 0001111042342"
            defaultValue={product?.upc ?? ""}
          />
        </div>

        {/* Product name at vendor */}
        <div className="grid gap-2">
          <label htmlFor="product_name" className="text-sm font-medium">
            Product Name (at vendor)
          </label>
          <Input
            id="product_name"
            name="product_name"
            placeholder="e.g., Kroger Boneless Chicken Breast 3lb"
            defaultValue={product?.product_name ?? ""}
          />
        </div>

        {/* Pack size & unit */}
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <label htmlFor="pack_size" className="text-sm font-medium">
              Pack Size
            </label>
            <Input
              id="pack_size"
              name="pack_size"
              type="number"
              step={0.1}
              min={0}
              placeholder="e.g., 3"
              defaultValue={product?.pack_size ?? ""}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">Pack Unit</label>
            <UnitSwitcher
              currentVal={product?.pack_unit ?? "lb"}
              name="pack_unit"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="grid gap-2">
          <label htmlFor="notes" className="text-sm font-medium">
            Notes
          </label>
          <Input
            id="notes"
            name="notes"
            placeholder="Optional notes"
            defaultValue={product?.notes ?? ""}
          />
        </div>

        {!state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </form>

      <DialogFooter className={cn(isEdit && "sm:justify-between")}>
        {isEdit && (
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
            form="vendor-product-form"
            disabled={pending || isDeleting}
          >
            {pending ? "Saving..." : isEdit ? "Save" : "Add"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Vendor Product Row
// ─────────────────────────────────────────────────────────────────────────────

function VendorProductRow({
  product,
  vendorId,
  inventoryItems,
}: {
  product: VendorProductWithInventory;
  vendorId: string;
  inventoryItems: { id: string; name: string; unit: string }[];
}) {
  const [editOpen, setEditOpen] = useState(false);

  return (
    <>
      <div className="rounded-lg border-split-gradient">
        <div
          className="flex h-auto min-h-6 md:min-h-10 items-center px-4 rounded-lg gap-3 text-xs md:text-sm hover:bg-primary/10 py-1.5"
          onClick={() => setEditOpen(true)}
        >
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">
              {product.inventory?.name ?? "Unknown item"}
            </p>
            {product.product_name && (
              <p className="text-xs text-muted-foreground truncate">
                {product.product_name}
              </p>
            )}
          </div>
          {product.upc && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Barcode className="w-3 md:w-4" />
                    <span className="text-xs hidden sm:inline font-mono">
                      {product.upc}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>UPC: {product.upc}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {product.pack_size && (
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {product.pack_size} {product.pack_unit}
            </span>
          )}
        </div>
      </div>
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md border border-foreground">
          <VendorProductFormContent
            vendorId={vendorId}
            product={product}
            inventoryItems={inventoryItems}
            onSuccess={() => setEditOpen(false)}
            onDelete={() => setEditOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export function VendorsClient({
  vendors,
  selectedVendorId,
  products: initialProducts,
  totalProducts: initialTotal,
  hasMore: initialHasMore,
  search,
  itemsPerLoad,
  inventoryItems,
}: {
  vendors: Vendor[];
  selectedVendorId: string;
  products: VendorProductWithInventory[];
  totalProducts: number;
  hasMore: boolean;
  search: string;
  itemsPerLoad: number;
  inventoryItems: { id: string; name: string; unit: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [addVendorOpen, setAddVendorOpen] = useState(false);
  const [editVendorOpen, setEditVendorOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  // Infinite scroll state
  const [products, setProducts] =
    useState<VendorProductWithInventory[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [totalItems, setTotalItems] = useState(initialTotal);
  const [isLoading, setIsLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const currentLoad = useRef(1);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(initialHasMore);

  const [searchValue, setSearchValue] = useState(search);

  const selectedVendor = vendors.find((v) => v.id === selectedVendorId);

  // Reset on data change
  useEffect(() => {
    setProducts(initialProducts);
    currentLoad.current = 1;
    setHasMore(initialHasMore);
    hasMoreRef.current = initialHasMore;
    setIsLoading(false);
    isLoadingRef.current = false;
    setTotalItems(initialTotal);
  }, [initialProducts, initialHasMore, initialTotal]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params = new URLSearchParams();
      if (selectedVendorId) params.set("vendor", selectedVendorId);
      if (searchValue) params.set("q", searchValue);
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  const loadMore = useCallback(async () => {
    if (isLoadingRef.current || !hasMoreRef.current || !selectedVendorId) return;
    isLoadingRef.current = true;
    setIsLoading(true);
    try {
      const nextLoad = currentLoad.current + 1;
      const result = await fetchVendorProducts(
        selectedVendorId,
        nextLoad,
        search,
        itemsPerLoad,
      );
      setProducts((prev) => [...prev, ...result.items]);
      currentLoad.current = nextLoad;
      setHasMore(result.hasMore);
      hasMoreRef.current = result.hasMore;
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [selectedVendorId, search, itemsPerLoad]);

  // Intersection Observer
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleVendorSelect = (vendorId: string) => {
    const params = new URLSearchParams();
    params.set("vendor", vendorId);
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Vendor tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {vendors.map((v) => (
          <Button
            key={v.id}
            variant={v.id === selectedVendorId ? "default" : "outline"}
            size="sm"
            onClick={() => handleVendorSelect(v.id)}
          >
            <Store className="w-3 h-3" />
            {v.name}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAddVendorOpen(true)}
        >
          <Plus className="w-3 h-3" />
          Add Vendor
        </Button>
      </div>

      {/* Selected vendor content */}
      {selectedVendor ? (
        <div className="space-y-4">
          {/* Vendor header with edit + add product */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold">{selectedVendor.name}</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditVendorOpen(true)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit vendor</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Button onClick={() => setAddProductOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Product
            </Button>
          </div>

          {/* Search */}
          <Input
            placeholder="Search products..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="max-w-sm"
          />

          {/* Product list */}
          {products.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No product mappings yet.</p>
              <p className="text-sm">
                Add products to map inventory items to {selectedVendor.name}{" "}
                UPCs.
              </p>
            </div>
          ) : (
            <div>
              {products.map((product) => (
                <VendorProductRow
                  key={product.id}
                  product={product}
                  vendorId={selectedVendorId}
                  inventoryItems={inventoryItems}
                />
              ))}

              <div ref={sentinelRef} className="h-1" />

              {isLoading && (
                <div className="flex justify-center py-4">
                  <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              )}

              {!hasMore && products.length > 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  Showing all {totalItems} products
                </p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <Store className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>No vendors yet.</p>
          <p className="text-sm">Add a vendor like Kroger or Costco to get started.</p>
        </div>
      )}

      {/* Add Vendor Dialog */}
      <Dialog open={addVendorOpen} onOpenChange={setAddVendorOpen}>
        <DialogContent className="sm:max-w-md border border-foreground">
          <VendorFormContent
            mode="add"
            onSuccess={() => setAddVendorOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Vendor Dialog */}
      {selectedVendor && (
        <Dialog open={editVendorOpen} onOpenChange={setEditVendorOpen}>
          <DialogContent className="sm:max-w-md border border-foreground">
            <VendorFormContent
              mode="edit"
              vendor={selectedVendor}
              onSuccess={() => setEditVendorOpen(false)}
              onDelete={() => {
                setEditVendorOpen(false);
                router.push(pathname);
              }}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Add Product Dialog */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="sm:max-w-md border border-foreground">
          <VendorProductFormContent
            vendorId={selectedVendorId}
            inventoryItems={inventoryItems}
            onSuccess={() => setAddProductOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
