import { describe, expect, it } from "vitest";
import {
  areUnitsCompatible,
  convertUnit,
  convertWithDensity,
  formatQuantity,
  getDensityForIngredient,
  getUnitCategory,
  getUnitsForCategory,
} from "./unit-conversions";

describe("getUnitCategory", () => {
  it("categorizes weight units", () => {
    expect(getUnitCategory("g")).toBe("weight");
    expect(getUnitCategory("kg")).toBe("weight");
    expect(getUnitCategory("lb")).toBe("weight");
  });

  it("categorizes volume units", () => {
    expect(getUnitCategory("ml")).toBe("volume");
    expect(getUnitCategory("cup")).toBe("volume");
  });

  it("categorizes count units", () => {
    expect(getUnitCategory("pc")).toBe("count");
    expect(getUnitCategory("dozen")).toBe("count");
  });

  it("returns null for unknown units", () => {
    expect(getUnitCategory("furlong")).toBeNull();
  });
});

describe("convertUnit", () => {
  it("returns the same quantity when units match", () => {
    expect(convertUnit(250, "g", "g")).toBe(250);
  });

  it("converts within the weight category", () => {
    expect(convertUnit(1, "kg", "g")).toBeCloseTo(1000);
    expect(convertUnit(1000, "g", "kg")).toBeCloseTo(1);
  });

  it("converts within the volume category", () => {
    expect(convertUnit(1, "cup", "ml")).toBeCloseTo(236.588);
  });

  it("returns null across incompatible categories", () => {
    expect(convertUnit(1, "kg", "ml")).toBeNull();
  });

  it("returns null for an unrecognized unit", () => {
    expect(convertUnit(1, "kg", "furlong")).toBeNull();
  });
});

describe("convertWithDensity", () => {
  it("delegates to convertUnit within the same category", () => {
    expect(convertWithDensity(1, "kg", "g", 1)).toBeCloseTo(1000);
  });

  it("converts weight to volume using density", () => {
    // 236.588 ml of water (density 1) weighs 236.588 g
    expect(convertWithDensity(236.588, "g", "ml", 1)).toBeCloseTo(236.588);
  });

  it("converts volume to weight using density", () => {
    expect(convertWithDensity(1, "cup", "g", 0.593)).toBeCloseTo(236.588 * 0.593);
  });

  it("returns null for non-positive density", () => {
    expect(convertWithDensity(1, "cup", "g", 0)).toBeNull();
  });

  it("returns null between count and weight", () => {
    expect(convertWithDensity(1, "pc", "g", 1)).toBeNull();
  });
});

describe("formatQuantity", () => {
  it("drops decimals for whole numbers", () => {
    expect(formatQuantity(250, "g")).toBe("250 g");
  });

  it("keeps decimals to the given precision", () => {
    expect(formatQuantity(1.5, "cup")).toBe("1.50 cup");
    expect(formatQuantity(1.5, "cup", 1)).toBe("1.5 cup");
  });
});

describe("areUnitsCompatible", () => {
  it("is true for the same category", () => {
    expect(areUnitsCompatible("g", "kg")).toBe(true);
  });

  it("is true for weight/volume when density conversion allowed", () => {
    expect(areUnitsCompatible("g", "ml", true)).toBe(true);
  });

  it("is false for weight/volume when density conversion disallowed", () => {
    expect(areUnitsCompatible("g", "ml", false)).toBe(false);
  });

  it("is false for unknown units", () => {
    expect(areUnitsCompatible("g", "furlong")).toBe(false);
  });
});

describe("getUnitsForCategory", () => {
  it("lists weight units", () => {
    expect(getUnitsForCategory("weight")).toContain("kg");
  });

  it("lists all units combined", () => {
    const all = getUnitsForCategory("all");
    expect(all).toContain("g");
    expect(all).toContain("ml");
    expect(all).toContain("pc");
  });
});

describe("getDensityForIngredient", () => {
  it("finds a known ingredient case-insensitively", () => {
    expect(getDensityForIngredient("Sugar")).toBeCloseTo(0.845);
  });

  it("falls back to 1.0 for unknown ingredients", () => {
    expect(getDensityForIngredient("moon dust")).toBe(1.0);
  });
});
