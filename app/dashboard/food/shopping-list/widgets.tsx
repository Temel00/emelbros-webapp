"use client";

import {
  useState,
  useTransition,
  useActionState,
  useEffect,
  useCallback,
} from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  ShoppingCart,
  Loader,
  Trash2,
  RefreshCw,
  Check,
  Share2,
  Clipboard,
  ExternalLink,
} from "lucide-react";

import {
  generateShoppingList,
  clearShoppingList,
  togglePurchased,
  type ActionState,
  type ShoppingListItem,
} from "./actions";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatQuantity } from "@/lib/unit-conversions";

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI Components
// ─────────────────────────────────────────────────────────────────────────────

function ItemRow({ item }: { item: ShoppingListItem }) {
  const [isPending, startTransition] = useTransition();
  const [purchased, setPurchased] = useState(item.purchased);

  function handleToggle() {
    const next = !purchased;
    setPurchased(next);
    startTransition(async () => {
      await togglePurchased(item.id, next);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-colors",
        purchased
          ? "border-border/50 bg-muted/20 opacity-60"
          : "border-border bg-card/40",
      )}
    >
      <button
        type="button"
        onClick={handleToggle}
        disabled={isPending}
        className={cn(
          "flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors",
          purchased
            ? "bg-tertiary border-tertiary"
            : "border-input hover:border-primary",
        )}
        aria-label={purchased ? "Mark as not purchased" : "Mark as purchased"}
      >
        {purchased && <Check className="w-3 h-3 text-white" />}
      </button>
      <span
        className={cn(
          "flex-1 font-medium capitalize",
          purchased && "line-through text-muted-foreground",
        )}
      >
        {item.name}
      </span>
      <span className="text-sm text-muted-foreground tabular-nums">
        {formatQuantity(item.needed_qty, item.unit)}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Export Dialog
// ─────────────────────────────────────────────────────────────────────────────

type KrogerState = "idle" | "loading" | "success" | "error";

type KrogerResult = { added: number; notFound: string[] };

function ExportDialog({
  items,
  open,
  onOpenChange,
  autoAddToKroger,
}: {
  items: ShoppingListItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoAddToKroger: boolean;
}) {
  const [copyDone, setCopyDone] = useState(false);
  const [krogerState, setKrogerState] = useState<KrogerState>("idle");
  const [krogerResult, setKrogerResult] = useState<KrogerResult | null>(null);
  const [krogerError, setKrogerError] = useState<string | null>(null);

  const unpurchasedItems = items.filter((i) => !i.purchased);
  const exportItems = unpurchasedItems.length > 0 ? unpurchasedItems : items;

  function handleCopyText() {
    const dateStr = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const lines = [
      `Shopping List — ${dateStr}`,
      "─".repeat(32),
      ...exportItems.map(
        (item) =>
          `□  ${item.name.padEnd(24)} ${formatQuantity(item.needed_qty, item.unit)} ${item.unit}`,
      ),
    ];
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  }

  const handleKrogerCart = useCallback(async () => {
    setKrogerState("loading");
    setKrogerError(null);
    setKrogerResult(null);

    const res = await fetch("/api/kroger/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: exportItems }),
    });

    if (res.status === 401) {
      // Need to authenticate — redirect to Kroger OAuth
      window.location.href = "/api/kroger/auth";
      return;
    }

    const data = await res.json();

    if (!res.ok) {
      setKrogerState("error");
      setKrogerError(data.error ?? "Something went wrong");
      return;
    }

    setKrogerState("success");
    setKrogerResult({ added: data.added, notFound: data.notFound ?? [] });
  }, [exportItems]);

  // Auto-trigger Kroger cart addition when redirected back after OAuth
  useEffect(() => {
    if (open && autoAddToKroger && krogerState === "idle") {
      handleKrogerCart();
    }
  }, [open, autoAddToKroger, krogerState, handleKrogerCart]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setCopyDone(false);
      setKrogerState("idle");
      setKrogerResult(null);
      setKrogerError(null);
    }
  }, [open]);

  const krogerSubtext = () => {
    if (krogerState === "idle")
      return "Search & add items to your Kroger cart";
    if (krogerState === "loading") return "Searching Kroger catalog…";
    if (krogerState === "error") return krogerError;
    if (krogerState === "success" && krogerResult) {
      const added = `${krogerResult.added} item${krogerResult.added !== 1 ? "s" : ""} added`;
      const missed =
        krogerResult.notFound.length > 0
          ? ` · ${krogerResult.notFound.length} not found`
          : "";
      return added + missed;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Export Shopping List</DialogTitle>
          <DialogDescription>
            {exportItems.length} item{exportItems.length !== 1 ? "s" : ""}
            {unpurchasedItems.length < items.length && " (unpurchased only)"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          {/* Copy as Text */}
          <button
            type="button"
            onClick={handleCopyText}
            className="w-full flex items-center gap-3 p-4 rounded-lg border border-input hover:bg-accent/10 transition-colors text-left"
          >
            {copyDone ? (
              <Check className="w-5 h-5 flex-shrink-0 text-tertiary" />
            ) : (
              <Clipboard className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium text-sm">
                {copyDone ? "Copied!" : "Copy as Text"}
              </p>
              <p className="text-xs text-muted-foreground">
                Copy formatted list to clipboard
              </p>
            </div>
          </button>

          {/* Add to Kroger Cart */}
          <button
            type="button"
            onClick={handleKrogerCart}
            disabled={krogerState === "loading" || krogerState === "success"}
            className="w-full flex items-center gap-3 p-4 rounded-lg border border-input hover:bg-accent/10 transition-colors text-left disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {krogerState === "loading" ? (
              <Loader className="w-5 h-5 flex-shrink-0 animate-spin text-muted-foreground" />
            ) : krogerState === "success" ? (
              <Check className="w-5 h-5 flex-shrink-0 text-tertiary" />
            ) : (
              <ShoppingCart className="w-5 h-5 flex-shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-sm">Add to Kroger Cart</p>
                {krogerState === "idle" && (
                  <ExternalLink className="w-3 h-3 text-muted-foreground" />
                )}
              </div>
              <p
                className={cn(
                  "text-xs",
                  krogerState === "error"
                    ? "text-destructive"
                    : krogerState === "success"
                      ? "text-tertiary"
                      : "text-muted-foreground",
                )}
              >
                {krogerSubtext()}
              </p>
            </div>
          </button>

          {/* Not found detail */}
          {krogerState === "success" &&
            krogerResult &&
            krogerResult.notFound.length > 0 && (
              <p className="text-xs text-muted-foreground px-1">
                <span className="font-medium">Not found on Kroger: </span>
                {krogerResult.notFound.join(", ")}
              </p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

const initialState: ActionState = { ok: true };

export function ShoppingListClient({
  items,
  defaultStart,
  defaultEnd,
}: {
  items: ShoppingListItem[];
  defaultStart: string;
  defaultEnd: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const krogerConnected = searchParams.get("kroger_connected") === "true";
  const krogerError = searchParams.get("kroger_error");

  const [generateState, formAction, generatePending] = useActionState(
    generateShoppingList,
    initialState,
  );
  const [clearPending, startClearTransition] = useTransition();
  const [clearConfirm, setClearConfirm] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  // Auto-open export dialog and trigger Kroger cart after OAuth redirect
  useEffect(() => {
    if (krogerConnected || krogerError) {
      if (krogerConnected) setExportOpen(true);
      // Clean URL
      router.replace(pathname);
    }
  }, [krogerConnected, krogerError, router, pathname]);

  function handleClear() {
    startClearTransition(async () => {
      await clearShoppingList();
      setClearConfirm(false);
    });
  }

  const purchasedCount = items.filter((i) => i.purchased).length;
  const allPurchased = items.length > 0 && purchasedCount === items.length;

  return (
    <div className="space-y-6">
      {/* Generate form */}
      <div className="space-y-3 p-4 rounded-xl border bg-card/40">
        <p className="text-sm font-medium text-muted-foreground">
          Generate from meal plan
        </p>
        <form action={formAction} className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="start_date" className="text-sm font-medium">
              From
            </label>
            <Input
              id="start_date"
              name="start_date"
              type="date"
              defaultValue={defaultStart}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="end_date" className="text-sm font-medium">
              To
            </label>
            <Input
              id="end_date"
              name="end_date"
              type="date"
              defaultValue={defaultEnd}
              required
            />
          </div>
          <Button type="submit" disabled={generatePending}>
            {generatePending ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Generate
          </Button>
        </form>
        {!generateState.ok && (
          <p className="text-sm text-destructive">{generateState.error}</p>
        )}
      </div>

      {/* Kroger error banner */}
      {krogerError && (
        <p className="text-sm text-destructive px-1">
          Kroger connection failed: {krogerError.replace(/_/g, " ")}
        </p>
      )}

      {/* Shopping list */}
      {items.length === 0 ? (
        <div className="py-10 text-center text-muted-foreground">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-40" />
          <p>Your shopping list is empty.</p>
          <p className="text-sm">
            Generate a list from your meal plan above.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* List header */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {purchasedCount} of {items.length} purchased
            </p>
            <div className="flex items-center gap-1">
              {/* Export button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="icon"
                      size="icon"
                      onClick={() => setExportOpen(true)}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Export list</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Clear button */}
              {!clearConfirm ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="iconDestructive"
                        size="icon"
                        onClick={() => setClearConfirm(true)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Clear list</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-destructive">
                    Clear all items?
                  </span>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={clearPending}
                    onClick={handleClear}
                  >
                    {clearPending ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      "Clear"
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setClearConfirm(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          {allPurchased && (
            <p className="text-sm text-tertiary text-center py-2">
              All items purchased — ready to go!
            </p>
          )}

          <div className="space-y-2">
            {items.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      <ExportDialog
        items={items}
        open={exportOpen}
        onOpenChange={setExportOpen}
        autoAddToKroger={krogerConnected}
      />
    </div>
  );
}
