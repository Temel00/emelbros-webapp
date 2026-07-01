"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { Plus, Loader, MoreHorizontal, Landmark, CreditCard } from "lucide-react";
import {
  addFinancialAccount,
  editFinancialAccount,
  deleteFinancialAccount,
  addCreditAccount,
  editCreditAccount,
  deleteCreditAccount,
  type ActionState,
  type AccountType,
  type FinancialAccount,
  type CreditAccount,
  type MonthlyAccountsData,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checkings: "Checking",
  savings: "Savings",
};

const initialState: ActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Add Financial Account Dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddFinancialAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [state, formAction, pending] = useActionState(addFinancialAccount, initialState);
  const [type, setType] = useState<AccountType>("checkings");
  const didSubmit = useRef(false);

  useEffect(() => {
    if (pending) { didSubmit.current = true; return; }
    if (didSubmit.current) { didSubmit.current = false; if (state.ok) onOpenChange(false); }
  }, [pending, state.ok, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Bank Account</DialogTitle>
          <DialogDescription>Enter the details for your new bank account.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="type" value={type} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Account Type</label>
            <div className="flex gap-2">
              {(["checkings", "savings"] as AccountType[]).map((t) => (
                <Button
                  key={t}
                  type="button"
                  variant={type === t ? "default" : "outline"}
                  onClick={() => setType(t)}
                  className="flex-1"
                >
                  {ACCOUNT_TYPE_LABELS[t]}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="fa-name" className="text-sm font-medium">Account Name</label>
            <Input id="fa-name" name="name" placeholder="e.g. Chase Checking" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="fa-ending" className="text-sm font-medium">Ending 4 Digits</label>
            <Input
              id="fa-ending"
              name="ending_four"
              placeholder="1234"
              maxLength={4}
              pattern="\d{4}"
              inputMode="numeric"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="fa-balance" className="text-sm font-medium">Current Balance</label>
            <Input
              id="fa-balance"
              name="balance"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
            />
          </div>

          {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader className="w-4 h-4 animate-spin" /> : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Financial Account Dialog
// ─────────────────────────────────────────────────────────────────────────────

function EditFinancialAccountDialog({
  account,
  open,
  onOpenChange,
}: {
  account: FinancialAccount;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(editFinancialAccount, initialState);
  const didSubmit = useRef(false);

  useEffect(() => {
    if (pending) { didSubmit.current = true; return; }
    if (didSubmit.current) { didSubmit.current = false; if (state.ok) onOpenChange(false); }
  }, [pending, state.ok, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>Update the name or last 4 digits for this account.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={account.id} />

          <div className="space-y-2">
            <label htmlFor="efa-name" className="text-sm font-medium">Account Name</label>
            <Input id="efa-name" name="name" defaultValue={account.name} required />
          </div>

          <div className="space-y-2">
            <label htmlFor="efa-ending" className="text-sm font-medium">Ending 4 Digits</label>
            <Input
              id="efa-ending"
              name="ending_four"
              defaultValue={account.ending_four}
              maxLength={4}
              pattern="\d{4}"
              inputMode="numeric"
              required
            />
          </div>

          {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Credit Account Dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddCreditAccountDialog({
  financialAccounts,
  open,
  onOpenChange,
}: {
  financialAccounts: FinancialAccount[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(addCreditAccount, initialState);
  const [paymentAccountId, setPaymentAccountId] = useState<string>("");
  const didSubmit = useRef(false);

  useEffect(() => {
    if (pending) { didSubmit.current = true; return; }
    if (didSubmit.current) { didSubmit.current = false; if (state.ok) onOpenChange(false); }
  }, [pending, state.ok, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Credit Account</DialogTitle>
          <DialogDescription>Enter the details for your new credit account.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="payment_account_id" value={paymentAccountId} />

          <div className="space-y-2">
            <label htmlFor="ca-name" className="text-sm font-medium">Account Name</label>
            <Input id="ca-name" name="name" placeholder="e.g. Chase Sapphire" required />
          </div>

          <div className="space-y-2">
            <label htmlFor="ca-ending" className="text-sm font-medium">Ending 4 Digits</label>
            <Input
              id="ca-ending"
              name="ending_four"
              placeholder="5678"
              maxLength={4}
              pattern="\d{4}"
              inputMode="numeric"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="ca-current" className="text-sm font-medium">Current Balance</label>
              <Input
                id="ca-current"
                name="current_balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="ca-statement" className="text-sm font-medium">Statement Balance</label>
              <Input
                id="ca-statement"
                name="statement_balance"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="ca-paydate" className="text-sm font-medium">
              Payment Date <span className="text-muted-foreground">(day of month)</span>
            </label>
            <Input
              id="ca-paydate"
              name="payment_date"
              type="number"
              min="1"
              max="31"
              placeholder="15"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Payment Method <span className="text-muted-foreground">(optional)</span>
            </label>
            {financialAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank accounts added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentAccountId("")}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-sm transition-colors",
                    paymentAccountId === ""
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent/10",
                  )}
                >
                  None
                </button>
                {financialAccounts.map((acct) => (
                  <button
                    key={acct.id}
                    type="button"
                    onClick={() => setPaymentAccountId(acct.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md border text-sm transition-colors",
                      paymentAccountId === acct.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-accent/10",
                    )}
                  >
                    {acct.name} ****{acct.ending_four}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader className="w-4 h-4 animate-spin" /> : "Add Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit Credit Account Dialog
// ─────────────────────────────────────────────────────────────────────────────

function EditCreditAccountDialog({
  account,
  financialAccounts,
  open,
  onOpenChange,
}: {
  account: CreditAccount;
  financialAccounts: FinancialAccount[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [state, formAction, pending] = useActionState(editCreditAccount, initialState);
  const [paymentAccountId, setPaymentAccountId] = useState<string>(account.payment_account_id ?? "");
  const didSubmit = useRef(false);

  useEffect(() => {
    if (pending) { didSubmit.current = true; return; }
    if (didSubmit.current) { didSubmit.current = false; if (state.ok) onOpenChange(false); }
  }, [pending, state.ok, onOpenChange]);

  useEffect(() => {
    setPaymentAccountId(account.payment_account_id ?? "");
  }, [account.payment_account_id]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Credit Account</DialogTitle>
          <DialogDescription>Update details for this credit account.</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={account.id} />
          <input type="hidden" name="payment_account_id" value={paymentAccountId} />

          <div className="space-y-2">
            <label htmlFor="eca-name" className="text-sm font-medium">Account Name</label>
            <Input id="eca-name" name="name" defaultValue={account.name} required />
          </div>

          <div className="space-y-2">
            <label htmlFor="eca-ending" className="text-sm font-medium">Ending 4 Digits</label>
            <Input
              id="eca-ending"
              name="ending_four"
              defaultValue={account.ending_four}
              maxLength={4}
              pattern="\d{4}"
              inputMode="numeric"
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="eca-paydate" className="text-sm font-medium">
              Payment Date <span className="text-muted-foreground">(day of month)</span>
            </label>
            <Input
              id="eca-paydate"
              name="payment_date"
              type="number"
              min="1"
              max="31"
              defaultValue={account.payment_date ?? ""}
              placeholder="15"
              inputMode="numeric"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Payment Method</label>
            {financialAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bank accounts added yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentAccountId("")}
                  className={cn(
                    "px-3 py-1.5 rounded-md border text-sm transition-colors",
                    paymentAccountId === ""
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent/10",
                  )}
                >
                  None
                </button>
                {financialAccounts.map((acct) => (
                  <button
                    key={acct.id}
                    type="button"
                    onClick={() => setPaymentAccountId(acct.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md border text-sm transition-colors",
                      paymentAccountId === acct.id
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-input hover:bg-accent/10",
                    )}
                  >
                    {acct.name} ****{acct.ending_four}
                  </button>
                ))}
              </div>
            )}
          </div>

          {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <Loader className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Confirm Dialog
// ─────────────────────────────────────────────────────────────────────────────

function DeleteConfirmDialog({
  name,
  open,
  onOpenChange,
  onDelete,
}: {
  name: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDelete: () => Promise<ActionState>;
}) {
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setTyped(""); setError(null); }
  }, [open]);

  const matches = typed === name;

  const handleDelete = async () => {
    if (!matches) return;
    setPending(true);
    setError(null);
    const result = await onDelete();
    setPending(false);
    if (result.ok) {
      onOpenChange(false);
    } else {
      setError(result.error ?? "Failed to delete");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Account</DialogTitle>
          <DialogDescription>
            This cannot be undone. Type <strong>{name}</strong> to confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={name}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              disabled={!matches || pending}
              onClick={handleDelete}
            >
              {pending ? <Loader className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial Account Card
// ─────────────────────────────────────────────────────────────────────────────

function FinancialAccountCard({ account }: { account: FinancialAccount }) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const handleDelete = async () => {
    const fd = new FormData();
    fd.append("id", account.id);
    return deleteFinancialAccount({ ok: true }, fd);
  };

  return (
    <>
      <Card className="bg-tertiary/10 border-tertiary/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Landmark className="w-4 h-4 text-tertiary shrink-0" />
              <CardTitle className="truncate">{account.name}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 -mt-0.5">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  Edit Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <Badge variant="outline" className="w-fit text-xs">
            {ACCOUNT_TYPE_LABELS[account.type]}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-xs text-muted-foreground">Account ending in {account.ending_four}</p>
          <p className="text-lg font-semibold text-tertiary">{formatCurrency(account.balance)}</p>
        </CardContent>
      </Card>

      <EditFinancialAccountDialog account={account} open={editOpen} onOpenChange={setEditOpen} />
      <DeleteConfirmDialog
        name={account.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={handleDelete}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit Account Card
// ─────────────────────────────────────────────────────────────────────────────

function CreditAccountCard({
  account,
  financialAccounts,
}: {
  account: CreditAccount;
  financialAccounts: FinancialAccount[];
}) {
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const linkedAccount = financialAccounts.find((a) => a.id === account.payment_account_id);

  const handleDelete = async () => {
    const fd = new FormData();
    fd.append("id", account.id);
    return deleteCreditAccount({ ok: true }, fd);
  };

  return (
    <>
      <Card className="bg-destructive/10 border-destructive/30">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <CreditCard className="w-4 h-4 text-destructive shrink-0" />
              <CardTitle className="truncate">{account.name}</CardTitle>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0 -mt-0.5">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                  Edit Account
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={() => setDeleteOpen(true)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete Account
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <p className="text-xs text-muted-foreground">Account ending in {account.ending_four}</p>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Current Balance</span>
            <span className="text-sm font-semibold text-destructive">
              {formatCurrency(account.current_balance)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Statement Balance</span>
            <span className="text-sm font-medium">{formatCurrency(account.statement_balance)}</span>
          </div>
          {account.payment_date != null && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Payment Due</span>
              <span className="text-sm font-medium">{ordinal(account.payment_date)} of the month</span>
            </div>
          )}
          {linkedAccount && (
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">Pay From</span>
              <span className="text-sm font-medium">
                {linkedAccount.name} ****{linkedAccount.ending_four}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <EditCreditAccountDialog
        account={account}
        financialAccounts={financialAccounts}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
      <DeleteConfirmDialog
        name={account.name}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDelete={handleDelete}
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Accounts Tab
// ─────────────────────────────────────────────────────────────────────────────

function AccountsTab({ data }: { data: MonthlyAccountsData }) {
  const [addBankOpen, setAddBankOpen] = useState(false);
  const [addCreditOpen, setAddCreditOpen] = useState(false);

  const checkings = data.financialAccounts.filter((a) => a.type === "checkings");
  const savings = data.financialAccounts.filter((a) => a.type === "savings");

  return (
    <div className="space-y-8">
      {/* Bank Accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Bank Accounts</h2>
          <Button size="sm" onClick={() => setAddBankOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Account
          </Button>
        </div>

        {data.financialAccounts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No bank accounts added yet.
          </div>
        ) : (
          <div className="space-y-4">
            {checkings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Checking</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {checkings.map((acct) => (
                    <FinancialAccountCard key={acct.id} account={acct} />
                  ))}
                </div>
              </div>
            )}
            {savings.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Savings</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savings.map((acct) => (
                    <FinancialAccountCard key={acct.id} account={acct} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Credit Accounts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Credit Accounts</h2>
          <Button size="sm" onClick={() => setAddCreditOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Credit
          </Button>
        </div>

        {data.creditAccounts.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No credit accounts added yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.creditAccounts.map((acct) => (
              <CreditAccountCard
                key={acct.id}
                account={acct}
                financialAccounts={data.financialAccounts}
              />
            ))}
          </div>
        )}
      </div>

      <AddFinancialAccountDialog open={addBankOpen} onOpenChange={setAddBankOpen} />
      <AddCreditAccountDialog
        financialAccounts={data.financialAccounts}
        open={addCreditOpen}
        onOpenChange={setAddCreditOpen}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────────────────────

export function MonthlyDashboard({ data }: { data: MonthlyAccountsData }) {
  return (
    <Tabs defaultValue="accounts">
      <TabsList>
        <TabsTrigger value="accounts">Accounts</TabsTrigger>
        <TabsTrigger value="budget">Budget</TabsTrigger>
      </TabsList>

      <TabsContent value="accounts" className="mt-4">
        <AccountsTab data={data} />
      </TabsContent>

      <TabsContent value="budget" className="mt-4">
        <div className="py-12 text-center text-muted-foreground">
          Budget tools coming soon.
        </div>
      </TabsContent>
    </Tabs>
  );
}
