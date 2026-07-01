# Data Model

Full raw DDL lives in [SupabaseSchema.txt](../../SupabaseSchema.txt) at the repo root — treat that as the source of truth for column names/types, and this doc as the narrative map of how tables relate. See [CONTEXT.md](../../CONTEXT.md) for term definitions (Household, Inventory Item, etc.).

> **Known gap:** `SupabaseSchema.txt` is missing the `financial_accounts` and `credit_accounts` table definitions, even though `monthly_financial_account_snapshots` / `monthly_credit_account_snapshots` reference them by FK and `app/dashboard/monthly/actions.ts` queries them directly. If you're touching the Monthly feature, get the real column list from a live query or from `app/dashboard/monthly/actions.ts`'s `FinancialAccount`/`CreditAccount` types, not from the schema file. Fixing this drift is a good candidate `agent-ready` issue.

## Two ownership models

Tables in this app are scoped one of two ways — knowing which applies to a table tells you which filter every query on it needs.

**Household-scoped** (Food domain only): rows carry `household_id`, shared by everyone in that household.
- `households`, `household_members`, `household_invites`
- `inventory`, `recipes`, `recipe_ingredients`, `instructions`, `tools`, `instruction_tools`, `tags`, `recipe_tags`, `meal_plans`, `shopping_list_items`, `vendors`, `vendor_products`

**User-scoped** (Health, Hobbies, Monthly domains): rows carry `user_id` directly, private to that individual even within a shared household.
- `water_logs`, `exercises`, `measurements`
- `darts_games`
- `financial_accounts`, `credit_accounts`, `monthly_net_worth_snapshots`, `monthly_financial_account_snapshots`, `monthly_credit_account_snapshots`

`profiles` is one-to-one with `auth.users` and is the only table that's neither — it's the identity anchor both models key off of. Get the current household with `getUserHouseholdId()` ([lib/supabase/household.ts](../../lib/supabase/household.ts)), which resolves through `household_members`.

## Food domain relationships

```
households ──< household_members >── auth.users
households ──< inventory
households ──< recipes ──< recipe_ingredients >── inventory
recipes ──< instructions ──< instruction_tools >── tools
recipes ──< recipe_tags >── tags
recipes ──< meal_plans
households ──< shopping_list_items >── inventory (optional link)
households ──< vendors ──< vendor_products >── inventory
```

- A **Recipe Ingredient** references an **Inventory Item** and carries its own `amount`/`unit`, which may differ from the inventory item's stored unit — conversion happens via [unit-conversion-system.md](unit-conversion-system.md), using the inventory item's `density`.
- `recipe_ingredients.used_in_steps` and `first_used_step` link an ingredient to specific `instructions.step_number`s, driving the recipe detail page's step-by-step ingredient callouts.
- `shopping_list_items.inventory_id` is nullable — a shopping list item can be a one-off (not tied to a tracked inventory item).

## Health domain

`water_logs`, `exercises`, `measurements` are flat, independent, user-scoped log tables — no cross-references between them. `measurements.weight_kg` is stored in kg; the UI converts to lbs via `kgToLbs()` in [lib/unit-helpers.ts](../../lib/unit-helpers.ts), and BMI is computed on the fly from `weight_kg` + `profiles.height_in` (not stored).

## Hobbies domain

`darts_games` is the only table currently backing the Hobbies section (win/loss log with optional opponent name). The Hobbies UI also references a "Disc Duels" concept ([app/dashboard/page.tsx](../../app/dashboard/page.tsx)) that has no backing table yet — treat it as an unimplemented stub, not a bug, if you see it referenced without data.

## Monthly domain

```
financial_accounts (checkings|savings)
credit_accounts ──> financial_accounts (optional payment_account_id)
monthly_net_worth_snapshots ──< monthly_financial_account_snapshots ──> financial_accounts (SET NULL on delete)
monthly_net_worth_snapshots ──< monthly_credit_account_snapshots ──> credit_accounts (SET NULL on delete)
```

A **Net Worth Snapshot** is a monthly upsert (`unique(user_id, month)`) that freezes each account's balance at review time into the child snapshot tables — this is deliberate: if you edit a `financial_accounts.balance` later, past snapshots must NOT change, which is why `monthly_financial_account_snapshots` duplicates `account_name`/`balance` rather than joining live. `financial_account_id`/`credit_account_id` on the snapshot rows are `ON DELETE SET NULL`, so a snapshot survives the deletion of the account it was taken from.

These three Monthly tables are the only ones in the schema with RLS policies defined in `SupabaseSchema.txt`; other tables likely have RLS configured in Supabase directly but it isn't reflected in the schema dump — don't assume a table is unprotected just because no `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` appears here.
