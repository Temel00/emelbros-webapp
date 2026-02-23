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
  addTool,
  updateTool,
  deleteTool,
  fetchTools,
  type ToolActionState,
  type Tool,
} from "./actions";
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
import { cn } from "@/lib/utils";
import { Trash2, Loader, Plus, MapPin } from "lucide-react";

const initialState: ToolActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Tool Form Content (Add / Edit)
// ─────────────────────────────────────────────────────────────────────────────

function ToolFormContent({
  mode,
  item,
  onSuccess,
  onDelete,
}: {
  mode: "add" | "edit";
  item?: Tool;
  onSuccess: (toolName?: string) => void;
  onDelete?: (toolName: string) => void;
}) {
  const action = mode === "add" ? addTool : updateTool;
  const [state, formAction, pending] = useActionState(action, initialState);
  const nameRef = useRef<HTMLInputElement>(null);
  const hasSubmitted = useRef(false);
  const submittedNameRef = useRef<string>("");
  const [isDeleting, setIsDeleting] = useState(false);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onDeleteRef = useRef(onDelete);
  onDeleteRef.current = onDelete;

  const wrappedFormAction = (formData: FormData) => {
    const name = String(formData.get("name") || "").trim();
    submittedNameRef.current = name;
    return formAction(formData);
  };

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
      "Are you sure you want to delete this tool?",
    );
    if (!confirmed) return;
    setIsDeleting(true);
    const fd = new FormData();
    fd.append("id", item.id);
    const result = await deleteTool(initialState, fd);
    setIsDeleting(false);
    if (result.ok) {
      onSuccessRef.current();
      onDeleteRef.current?.(item.name);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>{mode === "add" ? "Add Tool" : "Edit Tool"}</DialogTitle>
        <DialogDescription>
          {mode === "add"
            ? "Add a new kitchen tool."
            : `Edit details for ${item?.name}.`}
        </DialogDescription>
      </DialogHeader>

      <form
        id="tool-form"
        action={wrappedFormAction}
        className="grid gap-4"
      >
        {mode === "edit" && item && (
          <Input type="hidden" name="id" value={item.id} />
        )}

        <div className="grid gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name
          </label>
          <Input
            ref={nameRef}
            id="name"
            name="name"
            placeholder="Tool name"
            defaultValue={item?.name ?? ""}
            required
          />
        </div>

        <div className="grid gap-2">
          <label htmlFor="location" className="text-sm font-medium">
            Location
          </label>
          <Input
            id="location"
            name="location"
            placeholder="e.g., drawer 3, cabinet above stove"
            defaultValue={item?.location ?? ""}
          />
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
          </Button>
        )}
        <div className="flex gap-2">
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            type="submit"
            form="tool-form"
            disabled={pending || isDeleting}
          >
            {pending ? "Saving..." : mode === "add" ? "Add" : "Save"}
          </Button>
        </div>
      </DialogFooter>
    </>
  );
}

function ToolItemDialog({
  mode,
  item,
  open,
  onOpenChange,
  onItemSaved,
  onItemDeleted,
}: {
  mode: "add" | "edit";
  item?: Tool;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemSaved?: (name: string) => void;
  onItemDeleted?: (name: string) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border border-foreground">
        <ToolFormContent
          mode={mode}
          item={item}
          onSuccess={(toolName) => {
            onOpenChange(false);
            if (toolName) onItemSaved?.(toolName);
          }}
          onDelete={(toolName) => {
            onOpenChange(false);
            onItemDeleted?.(toolName);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Tool Dialog & Success Messages
// ─────────────────────────────────────────────────────────────────────────────

export function AddToolDialog() {
  const [open, setOpen] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const successMessage = searchParams.get("success");

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
        Add Tool
      </Button>
      {successMessage && (
        <p className="text-sm text-tertiary animate-in fade-in duration-300">
          {successMessage}
        </p>
      )}
      <ToolItemDialog
        mode="add"
        open={open}
        onOpenChange={setOpen}
        onItemSaved={handleItemSaved}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool Item Row (Display + Edit Dialog)
// ─────────────────────────────────────────────────────────────────────────────

export function ToolItemRow({ item }: { item: Tool }) {
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
          <p className="flex-1">{item.name}</p>
          {item.location && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="w-3 md:w-4" />
              <p className="text-xs md:text-sm">{item.location}</p>
            </div>
          )}
        </div>
      </div>
      <ToolItemDialog
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
// Search Filter
// ─────────────────────────────────────────────────────────────────────────────

export function ToolsSearchFilter() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");

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

  return (
    <div className="flex gap-4 items-center">
      <Input
        placeholder="Search by name..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        className="max-w-sm"
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Infinite Scroll
// ─────────────────────────────────────────────────────────────────────────────

export function InfiniteToolsList({
  initialItems,
  initialHasMore,
  totalItems: initialTotal,
  search,
  itemsPerLoad,
}: {
  initialItems: Tool[];
  initialHasMore: boolean;
  totalItems: number;
  search: string;
  itemsPerLoad: number;
}) {
  const [items, setItems] = useState<Tool[]>(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(initialTotal);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const currentLoad = useRef(1);
  const isLoadingRef = useRef(false);
  const hasMoreRef = useRef(initialHasMore);

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
      const result = await fetchTools(nextLoad, search, itemsPerLoad);
      setItems((prev) => [...prev, ...result.items]);
      currentLoad.current = nextLoad;
      setHasMore(result.hasMore);
      hasMoreRef.current = result.hasMore;
      setTotalItems(result.totalItems);
    } catch (error) {
      console.error("Failed to load more tools:", error);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [search, itemsPerLoad]);

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
        <ToolItemRow key={item.id} item={item} />
      ))}

      <div ref={sentinelRef} className="h-1" />

      {isLoading && (
        <div className="flex justify-center py-4">
          <Loader className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Showing all {totalItems} tools
        </p>
      )}
    </div>
  );
}
