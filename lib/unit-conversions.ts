import type { UnitCategory } from "@/components/unit-switcher";

// Conversion factors to base units (g for weight, ml for volume, pc for count)
const WEIGHT_TO_GRAMS: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  oz: 28.3495,
  lb: 453.592,
};

const VOLUME_TO_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  tsp: 4.92892,
  tbsp: 14.7868,
  cup: 236.588,
  "fl oz": 29.5735,
  pt: 473.176,
  qt: 946.353,
  gal: 3785.41,
};

const COUNT_TO_PIECES: Record<string, number> = {
  pc: 1,
  dozen: 12,
};

/**
 * Determines the category of a unit
 */
export function getUnitCategory(unit: string): UnitCategory | null {
  if (unit in WEIGHT_TO_GRAMS) return "weight";
  if (unit in VOLUME_TO_ML) return "volume";
  if (unit in COUNT_TO_PIECES) return "count";
  return null;
}

/**
 * Converts a quantity from one unit to another within the same category
 * @param quantity - The amount to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @returns The converted quantity, or null if conversion is not possible
 */
export function convertUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string,
): number | null {
  if (fromUnit === toUnit) return quantity;

  const fromCategory = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);

  // Units must be in the same category for direct conversion
  if (!fromCategory || fromCategory !== toCategory) {
    return null;
  }

  // Convert to base unit, then to target unit
  let baseQuantity: number;
  let toBaseConversion: number;

  switch (fromCategory) {
    case "weight":
      baseQuantity = quantity * WEIGHT_TO_GRAMS[fromUnit];
      toBaseConversion = WEIGHT_TO_GRAMS[toUnit];
      break;
    case "volume":
      baseQuantity = quantity * VOLUME_TO_ML[fromUnit];
      toBaseConversion = VOLUME_TO_ML[toUnit];
      break;
    case "count":
      baseQuantity = quantity * COUNT_TO_PIECES[fromUnit];
      toBaseConversion = COUNT_TO_PIECES[toUnit];
      break;
    default:
      return null;
  }

  return baseQuantity / toBaseConversion;
}

/**
 * Converts between weight and volume using density
 * @param quantity - The amount to convert
 * @param fromUnit - The source unit
 * @param toUnit - The target unit
 * @param density - The density in g/ml (e.g., water = 1, flour ≈ 0.593)
 * @returns The converted quantity, or null if conversion is not possible
 */
export function convertWithDensity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  density: number,
): number | null {
  if (fromUnit === toUnit) return quantity;
  if (density <= 0) return null;

  const fromCategory = getUnitCategory(fromUnit);
  const toCategory = getUnitCategory(toUnit);

  // If same category, use standard conversion
  if (fromCategory === toCategory) {
    return convertUnit(quantity, fromUnit, toUnit);
  }

  // Handle weight ↔ volume conversion
  if (fromCategory === "weight" && toCategory === "volume") {
    // Convert weight to grams
    const grams = quantity * WEIGHT_TO_GRAMS[fromUnit];
    // Convert to ml using density (g/ml)
    const ml = grams / density;
    // Convert ml to target volume unit
    return ml / VOLUME_TO_ML[toUnit];
  }

  if (fromCategory === "volume" && toCategory === "weight") {
    // Convert volume to ml
    const ml = quantity * VOLUME_TO_ML[fromUnit];
    // Convert to grams using density (g/ml)
    const grams = ml * density;
    // Convert grams to target weight unit
    return grams / WEIGHT_TO_GRAMS[toUnit];
  }

  // Cannot convert between count and weight/volume
  return null;
}

/**
 * Formats a quantity with its unit for display
 * @param quantity - The numeric quantity
 * @param unit - The unit string
 * @param precision - Number of decimal places (default: 2)
 * @returns Formatted string like "250.00 g" or "1.5 cups"
 */
export function formatQuantity(
  quantity: number,
  unit: string,
  precision: number = 2,
): string {
  // For whole numbers, don't show decimal places
  const rounded = Number(quantity.toFixed(precision));
  const formatted = rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(precision);

  return `${formatted} ${unit}`;
}

/**
 * Calculates how much inventory will be used for a recipe ingredient
 * @param recipeAmount - Amount needed in recipe
 * @param recipeUnit - Unit used in recipe
 * @param inventoryUnit - Unit stored in inventory
 * @param density - Density of the ingredient (g/ml)
 * @returns Amount to deduct from inventory, or null if conversion fails
 */
export function calculateInventoryUsage(
  recipeAmount: number,
  recipeUnit: string,
  inventoryUnit: string,
  density: number = 1,
): number | null {
  return convertWithDensity(recipeAmount, recipeUnit, inventoryUnit, density);
}

/**
 * Checks if two units are compatible for conversion
 * @param unit1 - First unit
 * @param unit2 - Second unit
 * @param allowDensityConversion - Whether to allow weight↔volume conversion
 * @returns true if units can be converted
 */
export function areUnitsCompatible(
  unit1: string,
  unit2: string,
  allowDensityConversion: boolean = true,
): boolean {
  const category1 = getUnitCategory(unit1);
  const category2 = getUnitCategory(unit2);

  if (!category1 || !category2) return false;
  if (category1 === category2) return true;

  // Weight and volume are compatible if density conversion is allowed
  if (allowDensityConversion) {
    return (
      (category1 === "weight" && category2 === "volume") ||
      (category1 === "volume" && category2 === "weight")
    );
  }

  return false;
}

/**
 * Gets all available units for a specific category
 */
export function getUnitsForCategory(category: UnitCategory): string[] {
  switch (category) {
    case "weight":
      return Object.keys(WEIGHT_TO_GRAMS);
    case "volume":
      return Object.keys(VOLUME_TO_ML);
    case "count":
      return Object.keys(COUNT_TO_PIECES);
    case "all":
      return [
        ...Object.keys(WEIGHT_TO_GRAMS),
        ...Object.keys(VOLUME_TO_ML),
        ...Object.keys(COUNT_TO_PIECES),
      ];
  }
}

/**
 * Common ingredient densities (g/ml)
 * These are approximate values for typical ingredients
 */
export const COMMON_DENSITIES: Record<string, number> = {
  // Liquids
  water: 1.0,
  milk: 1.03,
  oil: 0.92,
  honey: 1.42,
  "maple syrup": 1.37,

  // Dry ingredients
  "all-purpose flour": 0.593,
  "bread flour": 0.593,
  "cake flour": 0.496,
  "whole wheat flour": 0.593,
  sugar: 0.845,
  "brown sugar": 0.845,
  "powdered sugar": 0.496,
  salt: 1.217,
  "baking soda": 0.865,
  "baking powder": 0.865,

  // Grains
  rice: 0.845,
  oats: 0.338,

  // Dairy
  butter: 0.911,
  "cream cheese": 1.04,
  "sour cream": 1.0,
  yogurt: 1.04,
};

/**
 * Gets the density for a common ingredient, or returns default (1.0) if not found
 */
export function getDensityForIngredient(ingredientName: string): number {
  const normalized = ingredientName.toLowerCase().trim();
  return COMMON_DENSITIES[normalized] ?? 1.0;
}
