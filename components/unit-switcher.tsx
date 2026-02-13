"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useEffect, useState } from "react";
import { Input } from "./ui/input";

export type UnitCategory = "weight" | "volume" | "count" | "all";

export interface Unit {
  value: string;
  label: string;
  category: UnitCategory;
}

// Comprehensive unit definitions organized by category
export const UNITS: Unit[] = [
  // Weight units
  { value: "mg", label: "mg (milligram)", category: "weight" },
  { value: "g", label: "g (gram)", category: "weight" },
  { value: "kg", label: "kg (kilogram)", category: "weight" },
  { value: "oz", label: "oz (ounce)", category: "weight" },
  { value: "lb", label: "lb (pound)", category: "weight" },

  // Volume units
  { value: "ml", label: "ml (milliliter)", category: "volume" },
  { value: "l", label: "l (liter)", category: "volume" },
  { value: "tsp", label: "tsp (teaspoon)", category: "volume" },
  { value: "tbsp", label: "tbsp (tablespoon)", category: "volume" },
  { value: "cup", label: "cup", category: "volume" },
  { value: "fl oz", label: "fl oz (fluid ounce)", category: "volume" },
  { value: "pt", label: "pt (pint)", category: "volume" },
  { value: "qt", label: "qt (quart)", category: "volume" },
  { value: "gal", label: "gal (gallon)", category: "volume" },

  // Count units
  { value: "pc", label: "pc (piece)", category: "count" },
  { value: "dozen", label: "dozen", category: "count" },
];

interface UnitSwitcherProps {
  currentVal?: string;
  category?: UnitCategory;
  onValueChange?: (value: string) => void;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "ghost" | "outline";
  /** When provided, renders a hidden input with this name for form submission */
  name?: string;
}

export const UnitSwitcher = ({
  currentVal = "g",
  category = "all",
  onValueChange,
  size = "lg",
  variant = "ghost",
  name,
}: UnitSwitcherProps) => {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState(currentVal);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onValueChange?.(newValue);
  };

  // Filter units based on category
  const filteredUnits =
    category === "all"
      ? UNITS
      : UNITS.filter((unit) => unit.category === category);

  // Group units by category for display
  const weightUnits = filteredUnits.filter((u) => u.category === "weight");
  const volumeUnits = filteredUnits.filter((u) => u.category === "volume");
  const countUnits = filteredUnits.filter((u) => u.category === "count");

  if (!mounted) {
    return null;
  }

  return (
    <div>
      {name && <Input type="hidden" name={name} value={value} />}
      <DropdownMenu>
        <DropdownMenuTrigger className="h-8 w-20" asChild>
          <Button variant={variant} size={size}>
            {value}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuRadioGroup
            value={value}
            onValueChange={handleValueChange}
          >
            {weightUnits.length > 0 && (
              <>
                <DropdownMenuLabel>Weight</DropdownMenuLabel>
                {weightUnits.map((unit) => (
                  <DropdownMenuRadioItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </DropdownMenuRadioItem>
                ))}
                {(volumeUnits.length > 0 || countUnits.length > 0) && (
                  <DropdownMenuSeparator />
                )}
              </>
            )}

            {volumeUnits.length > 0 && (
              <>
                <DropdownMenuLabel>Volume</DropdownMenuLabel>
                {volumeUnits.map((unit) => (
                  <DropdownMenuRadioItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </DropdownMenuRadioItem>
                ))}
                {countUnits.length > 0 && <DropdownMenuSeparator />}
              </>
            )}

            {countUnits.length > 0 && (
              <>
                <DropdownMenuLabel>Count</DropdownMenuLabel>
                {countUnits.map((unit) => (
                  <DropdownMenuRadioItem key={unit.value} value={unit.value}>
                    {unit.label}
                  </DropdownMenuRadioItem>
                ))}
              </>
            )}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
