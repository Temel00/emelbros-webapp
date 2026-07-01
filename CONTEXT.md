# emelbros-webapp

A personal life-management app (Next.js App Router + Supabase) covering food/kitchen management, health tracking, hobbies, and monthly financial review. Access to each section is gated by a per-user access level.

## Architecture Docs

Deep-dive docs live in `docs/architecture/`. Read the one relevant to the area you're touching — don't load all of them by default.

- [data-model.md](docs/architecture/data-model.md) — Supabase tables, household-scoped vs user-scoped resources, relationships
- [auth-and-access.md](docs/architecture/auth-and-access.md) — OAuth flow, proxy session handling, the access-level gating system
- [server-actions-and-data-flow.md](docs/architecture/server-actions-and-data-flow.md) — the actions.ts/page.tsx/widgets.tsx pattern, revalidation conventions
- [unit-conversion-system.md](docs/architecture/unit-conversion-system.md) — weight/volume/count conversions, density-based conversion for recipes/inventory
- [feature-map.md](docs/architecture/feature-map.md) — one-paragraph summary of each dashboard section and what route owns it

See [AGENTS.md](AGENTS.md) for how the autonomous agent loop works in this repo, and [CLAUDE.md](CLAUDE.md) for coding conventions.

## Language

**Household**:
A group of users who share Food-domain data (inventory, recipes, tools, vendors, shopping lists). Every user belongs to exactly one household at a time (their own solo household by default, or a shared one they've joined).
_Avoid_: Account, group, family

**Access Level**:
A per-user tier (`mt_hood` > `mt_jeff` > `sisters`) stored on `profiles.access_level` that gates which dashboard sections a user can see. Higher tiers imply access to everything lower tiers can see.
_Avoid_: Role, permission, tier (use "access level")

**Profile**:
The `profiles` row for a user — one-to-one with `auth.users`, holds display name, access level, and body-metric fields (height, date of birth, sex) used for health calculations.
_Avoid_: User (a "user" is the Supabase auth identity; "profile" is the app-level record about them)

**Inventory Item**:
A household-scoped ingredient/supply record with an on-hand quantity, unit, and density (for weight↔volume conversion). Distinct from a **Recipe Ingredient**, which is a quantity of an Inventory Item referenced by a specific recipe.
_Avoid_: Ingredient (ambiguous between the two)

**Density**:
A g/ml conversion factor stored per Inventory Item, used to convert between weight and volume units for that specific ingredient (e.g., flour vs. water measure differently by volume).

**Vendor**:
A household-scoped store/supplier (e.g., a grocery chain) that Inventory Items can be linked to via **Vendor Product** records (UPC, pack size) for shopping/reordering.

**Access-gated Section**:
One of the top-level dashboard areas (Food, Health, Hobbies, Monthly) each requiring a minimum Access Level. Food requires `sisters` (lowest bar, effectively everyone); Health, Hobbies, and Monthly currently require `mt_hood`.

**Financial Account** / **Credit Account**:
User-scoped (not household-scoped) records under the Monthly section — a Financial Account is savings/checking (positive balance); a Credit Account tracks a card's current/statement balance and payment due date.

**Net Worth Snapshot**:
A monthly, user-scoped point-in-time capture of total savings, total debts, and the resulting net worth, taken during a "Monthly Review." Snapshots freeze the balances of each Financial/Credit Account at review time via child snapshot tables, so historical net worth doesn't shift if account balances change later.
