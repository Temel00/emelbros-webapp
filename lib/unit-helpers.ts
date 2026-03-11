const KG_PER_LB = 0.45359237;
const LB_PER_KG = 1 / KG_PER_LB;

export function kgToLbs(kg: number): number {
  return Math.round(kg * LB_PER_KG * 10) / 10;
}

export function lbsToKg(lbs: number): number {
  return lbs * KG_PER_LB;
}

export type BmiCategory = "Underweight" | "Normal" | "Overweight" | "Obese";

export function calculateBmi(weightKg: number, heightIn: number): number {
  const heightM = heightIn * 0.0254;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function getBmiCategory(bmi: number): BmiCategory {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Normal";
  if (bmi < 30) return "Overweight";
  return "Obese";
}
