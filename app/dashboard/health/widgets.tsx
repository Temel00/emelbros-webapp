"use client";

import { useState, useActionState, useEffect } from "react";
import Link from "next/link";
import {
  Droplets,
  Dumbbell,
  Ruler,
  Plus,
  Loader,
  TrendingDown,
  TrendingUp,
  Minus,
} from "lucide-react";
import {
  addWater,
  type ActionState,
  type HealthDashboardData,
} from "./actions";
import {
  kgToLbs,
  calculateBmi,
  getBmiCategory,
} from "@/lib/unit-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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

const WATER_GOAL_ML = 2500;

const QUICK_ADD_OPTIONS = [250, 500, 750];

const initialState: ActionState = { ok: true };

const BMI_CATEGORY_VARIANTS = {
  Underweight: "secondary",
  Normal: "default",
  Overweight: "secondary",
  Obese: "destructive",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Trend Indicator
// ─────────────────────────────────────────────────────────────────────────────

function TrendIndicator({
  current,
  previous,
  lowerIsBetter = true,
}: {
  current: number;
  previous: number | null;
  lowerIsBetter?: boolean;
}) {
  if (previous == null) return null;

  const diff = current - previous;
  if (Math.abs(diff) < 0.05) {
    return <Minus className="w-3 h-3 text-muted-foreground inline" />;
  }

  const isGood = lowerIsBetter ? diff < 0 : diff > 0;
  const Icon = diff < 0 ? TrendingDown : TrendingUp;

  return (
    <Icon
      className={`w-3 h-3 inline ${isGood ? "text-tertiary" : "text-destructive"}`}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Quick Add Water Dialog
// ─────────────────────────────────────────────────────────────────────────────

function QuickAddWaterDialog() {
  const [open, setOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [state, formAction, pending] = useActionState(addWater, initialState);

  useEffect(() => {
    if (state.ok && !pending) {
      setOpen(false);
      setCustomAmount("");
    }
  }, [state.ok, pending]);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Water</DialogTitle>
            <DialogDescription>
              Quick-add a common amount or enter a custom value.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-wrap gap-2">
            {QUICK_ADD_OPTIONS.map((ml) => (
              <form key={ml} action={formAction}>
                <Input type="hidden" name="amount_ml" value={ml} />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={pending}
                >
                  {ml} ml
                </Button>
              </form>
            ))}
          </div>

          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="custom_amount" className="text-sm font-medium">
                Custom amount (ml)
              </label>
              <Input
                id="custom_amount"
                name="amount_ml"
                type="number"
                min="1"
                step="1"
                placeholder="350"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                required
              />
            </div>

            {!state.ok && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  "Add"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Health Dashboard Widget
// ─────────────────────────────────────────────────────────────────────────────

export function HealthDashboard({ data }: { data: HealthDashboardData }) {
  const waterPct = Math.min(
    100,
    Math.round((data.todayWaterMl / WATER_GOAL_ML) * 100),
  );

  const { latest, previous } = data.measurementTrend;
  const heightIn = data.healthProfile.height_in;

  const latestBmi =
    heightIn != null && latest?.weight_kg != null
      ? calculateBmi(latest.weight_kg, heightIn)
      : null;

  const previousBmi =
    heightIn != null && previous?.weight_kg != null
      ? calculateBmi(previous.weight_kg, heightIn)
      : null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {/* Water Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Droplets className="w-5 h-5 text-accent" />
              <CardTitle>Water</CardTitle>
            </div>
            <QuickAddWaterDialog />
          </div>
          <CardDescription>Today&apos;s intake</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-end gap-1">
            <span className="text-2xl font-semibold">
              {data.todayWaterMl}
            </span>
            <span className="text-sm text-muted-foreground mb-0.5">
              / {WATER_GOAL_ML} ml
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-muted">
            <div
              className="h-2 rounded-full bg-accent transition-all"
              style={{ width: `${waterPct}%` }}
            />
          </div>
          <Link
            href="/dashboard/health/water"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View history
          </Link>
        </CardContent>
      </Card>

      {/* Exercises Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-5 h-5 text-tertiary" />
              <CardTitle>Exercises</CardTitle>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/health/exercises">
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <CardDescription>Today&apos;s activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {data.todayExercises.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No exercises logged today.
            </p>
          ) : (
            <>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-semibold">
                  {data.todayExercises.length}
                </span>
                <span className="text-sm text-muted-foreground mb-0.5">
                  exercises
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {data.todayExercises.slice(0, 3).map((ex) => (
                  <Badge key={ex.id} variant="outline">
                    {ex.name}
                  </Badge>
                ))}
                {data.todayExercises.length > 3 && (
                  <Badge variant="ghost">
                    +{data.todayExercises.length - 3} more
                  </Badge>
                )}
              </div>
            </>
          )}
          <Link
            href="/dashboard/health/exercises"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View all
          </Link>
        </CardContent>
      </Card>

      {/* Measurements Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-secondary" />
              <CardTitle>Measurements</CardTitle>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link href="/dashboard/health/measurements">
                <Plus className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <CardDescription>Latest trends</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {!latest ? (
            <p className="text-sm text-muted-foreground">
              No measurements recorded yet.
            </p>
          ) : (
            <div className="space-y-1.5 text-sm">
              {latest.weight_kg != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Weight</span>
                  <span className="font-medium flex items-center gap-1">
                    {kgToLbs(latest.weight_kg)} lbs
                    <TrendIndicator
                      current={latest.weight_kg}
                      previous={previous?.weight_kg ?? null}
                    />
                  </span>
                </div>
              )}
              {latestBmi != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">BMI</span>
                  <span className="font-medium flex items-center gap-1.5">
                    {latestBmi}
                    <Badge
                      variant={BMI_CATEGORY_VARIANTS[getBmiCategory(latestBmi)]}
                    >
                      {getBmiCategory(latestBmi)}
                    </Badge>
                    <TrendIndicator
                      current={latestBmi}
                      previous={previousBmi}
                    />
                  </span>
                </div>
              )}
              {latest.systolic_bp != null && latest.diastolic_bp != null && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">BP</span>
                  <span className="font-medium flex items-center gap-1">
                    {latest.systolic_bp}/{latest.diastolic_bp}
                    <TrendIndicator
                      current={latest.systolic_bp}
                      previous={previous?.systolic_bp ?? null}
                    />
                  </span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                {new Date(latest.measured_at).toLocaleDateString()}
              </p>
            </div>
          )}
          <Link
            href="/dashboard/health/measurements"
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            View history
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
