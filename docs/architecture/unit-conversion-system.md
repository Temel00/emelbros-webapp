# Unit Conversion System

Core logic lives in [lib/unit-conversions.ts](../../lib/unit-conversions.ts). This is pure, framework-free math — no Supabase calls — so it's a good target for Vitest unit tests once the test suite exists.

## Three unit categories

```
weight: mg, g, kg, oz, lb        (base unit: g)
volume: ml, l, tsp, tbsp, cup, fl oz, pt, qt, gal   (base unit: ml)
count:  pc, dozen                (base unit: pc)
```

`getUnitCategory(unit)` classifies any unit string into one of these three, or `null` if unrecognized. Every conversion function routes through this classification first — there's no cross-category math except the density path below.

## Same-category conversion

`convertUnit(qty, fromUnit, toUnit)` converts within a category by going through the base unit (e.g., `lb` → `g` → `kg`). Returns `null` if the units aren't in the same category — callers must handle `null`, not assume conversion always succeeds.

## Cross-category conversion via density

Weight ↔ volume conversion is only possible with a **density** (g/ml) — there's no universal conversion because it depends on the substance (flour ≠ water ≴ honey). `convertWithDensity(qty, fromUnit, toUnit, density)`:
- Delegates to `convertUnit()` if both units are already the same category (density is irrelevant then).
- Otherwise converts through grams-via-density: weight→volume divides by density, volume→weight multiplies by density.
- Returns `null` for `density <= 0` or for `count` ↔ weight/volume (count is never density-convertible — a "piece" has no universal mass).

`density` is stored per **Inventory Item** ([data-model.md](data-model.md)), defaulting to `1` (water-equivalent) in the DB schema. [COMMON_DENSITIES](../../lib/unit-conversions.ts) provides a lookup table of ~20 common ingredients (flour ≈ 0.593, sugar ≈ 0.845, etc.) used by `getDensityForIngredient()` to suggest a sensible default when a new inventory item is created, but the stored `density` is always per-item and user-editable — the common table is a convenience default, not an authoritative source consulted at conversion time.

## Where this feeds into inventory deduction

`calculateInventoryUsage(recipeAmount, recipeUnit, inventoryUnit, density)` is a thin wrapper over `convertWithDensity()`, used when a recipe is cooked to figure out how much to deduct from on-hand inventory when the recipe's ingredient unit differs from the inventory item's stored unit (e.g., recipe calls for "2 cups flour" but inventory tracks flour in grams).

`areUnitsCompatible(unit1, unit2, allowDensityConversion)` is the check used by UI components (e.g., the [UnitSwitcher](../../components/unit-switcher.tsx) dropdown) to decide whether to even offer a unit as a conversion target — same-category is always compatible; weight↔volume is compatible only if `allowDensityConversion` is true (the caller's choice, not a property of the units themselves).

## Formatting

`formatQuantity(qty, unit, precision = 2)` trims trailing zeros for whole numbers (`"2 g"` not `"2.00 g"`) but keeps decimal precision otherwise. This is purely a display helper — never use it to round a value that will be persisted or re-converted, since rounding before a subsequent conversion compounds error.
