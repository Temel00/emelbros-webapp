"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PostgrestError } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ActionState = {
  ok: boolean;
  error?: string;
};

export type AccountType = "checkings" | "savings";

export type FinancialAccount = {
  id: string;
  user_id: string;
  type: AccountType;
  name: string;
  ending_four: string;
  balance: number;
  created_at: string;
};

export type CreditAccount = {
  id: string;
  user_id: string;
  name: string;
  ending_four: string;
  current_balance: number;
  statement_balance: number;
  payment_date: number | null;
  payment_account_id: string | null;
  created_at: string;
};

export type MonthlyAccountsData = {
  financialAccounts: FinancialAccount[];
  creditAccounts: CreditAccount[];
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function validateEndingFour(value: string): string | null {
  if (!value || !/^\d{4}$/.test(value)) return "Ending 4 must be exactly 4 digits";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data Fetching
// ─────────────────────────────────────────────────────────────────────────────

export async function getMonthlyAccountsData(): Promise<MonthlyAccountsData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { financialAccounts: [], creditAccounts: [] };

  const [{ data: financialAccounts }, { data: creditAccounts }] =
    await Promise.all([
      supabase
        .from("financial_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("credit_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

  return {
    financialAccounts: (financialAccounts as FinancialAccount[]) ?? [],
    creditAccounts: (creditAccounts as CreditAccount[]) ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial Accounts
// ─────────────────────────────────────────────────────────────────────────────

export async function addFinancialAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const name = String(formData.get("name") || "").trim();
  const ending_four = String(formData.get("ending_four") || "").trim();
  const balance = parseFloat(String(formData.get("balance") || "0"));
  const type = String(formData.get("type") || "") as AccountType;

  if (!name) return { ok: false, error: "Name is required" };
  const endingErr = validateEndingFour(ending_four);
  if (endingErr) return { ok: false, error: endingErr };
  if (!["checkings", "savings"].includes(type))
    return { ok: false, error: "Invalid account type" };

  const { error } = await supabase.from("financial_accounts").insert({
    user_id: user.id,
    type,
    name,
    ending_four,
    balance: isNaN(balance) ? 0 : balance,
  });

  if (error) {
    if ((error as PostgrestError).code === "23505")
      return { ok: false, error: "An account with this name already exists" };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/monthly");
  return { ok: true };
}

export async function editFinancialAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const ending_four = String(formData.get("ending_four") || "").trim();

  if (!name) return { ok: false, error: "Name is required" };
  const endingErr = validateEndingFour(ending_four);
  if (endingErr) return { ok: false, error: endingErr };

  const { error } = await supabase
    .from("financial_accounts")
    .update({ name, ending_four })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/monthly");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit Accounts
// ─────────────────────────────────────────────────────────────────────────────

function parsePaymentDate(raw: string): { value: number | null; error?: string } {
  if (!raw.trim()) return { value: null };
  const n = parseInt(raw, 10);
  if (isNaN(n) || n < 1 || n > 31) return { value: null, error: "Payment date must be between 1 and 31" };
  return { value: n };
}

export async function addCreditAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const name = String(formData.get("name") || "").trim();
  const ending_four = String(formData.get("ending_four") || "").trim();
  const current_balance = parseFloat(String(formData.get("current_balance") || "0"));
  const statement_balance = parseFloat(String(formData.get("statement_balance") || "0"));
  const payment_date_raw = String(formData.get("payment_date") || "");
  const payment_account_id = String(formData.get("payment_account_id") || "").trim() || null;

  if (!name) return { ok: false, error: "Name is required" };
  const endingErr = validateEndingFour(ending_four);
  if (endingErr) return { ok: false, error: endingErr };

  const { value: payment_date, error: dateErr } = parsePaymentDate(payment_date_raw);
  if (dateErr) return { ok: false, error: dateErr };

  const { error } = await supabase.from("credit_accounts").insert({
    user_id: user.id,
    name,
    ending_four,
    current_balance: isNaN(current_balance) ? 0 : current_balance,
    statement_balance: isNaN(statement_balance) ? 0 : statement_balance,
    payment_date,
    payment_account_id,
  });

  if (error) {
    if ((error as PostgrestError).code === "23505")
      return { ok: false, error: "A credit account with this name already exists" };
    return { ok: false, error: error.message };
  }

  revalidatePath("/dashboard/monthly");
  return { ok: true };
}

export async function editCreditAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  const ending_four = String(formData.get("ending_four") || "").trim();
  const payment_date_raw = String(formData.get("payment_date") || "");
  const payment_account_id = String(formData.get("payment_account_id") || "").trim() || null;

  if (!name) return { ok: false, error: "Name is required" };
  const endingErr = validateEndingFour(ending_four);
  if (endingErr) return { ok: false, error: endingErr };

  const { value: payment_date, error: dateErr } = parsePaymentDate(payment_date_raw);
  if (dateErr) return { ok: false, error: dateErr };

  const { error } = await supabase
    .from("credit_accounts")
    .update({ name, ending_four, payment_date, payment_account_id })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/monthly");
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Actions
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteFinancialAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") || "");
  const { error } = await supabase
    .from("financial_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/monthly");
  return { ok: true };
}

export async function deleteCreditAccount(
  _prevState: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const id = String(formData.get("id") || "");
  const { error } = await supabase
    .from("credit_accounts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/monthly");
  return { ok: true };
}
