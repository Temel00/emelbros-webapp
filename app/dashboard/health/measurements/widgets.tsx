"use client";

import { useState, useActionState, useEffect } from "react";
import { Trash2, Loader, Plus } from "lucide-react";
import {
  addMeasurement,
  deleteMeasurement,
  updateHealthProfile,
  type ActionState,
  type Measurement,
  type HealthProfile,
} from "./actions";
import {
  kgToLbs,
  calculateBmi,
  getBmiCategory,
} from "@/lib/unit-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const initialState: ActionState = { ok: true };

const BMI_CATEGORY_VARIANTS = {
  Underweight: "secondary",
  Normal: "default",
  Overweight: "secondary",
  Obese: "destructive",
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Health Profile Dialog
// ─────────────────────────────────────────────────────────────────────────────

function HealthProfileDialog({ profile }: { profile: HealthProfile }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateHealthProfile,
    initialState,
  );

  useEffect(() => {
    if (state.ok && !pending) {
      setOpen(false);
    }
  }, [state.ok, pending]);

  const feet = profile.height_in
    ? Math.floor(profile.height_in / 12)
    : "";
  const inches = profile.height_in ? profile.height_in % 12 : "";

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        {profile.height_in
          ? `${Math.floor(profile.height_in / 12)}′${profile.height_in % 12}″`
          : "Set Height"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Your Height</DialogTitle>
            <DialogDescription>
              Height is used to calculate BMI from your weight.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="h_feet" className="text-sm font-medium">
                  Feet
                </label>
                <Input
                  id="h_feet"
                  name="feet"
                  type="number"
                  min="3"
                  max="8"
                  defaultValue={feet}
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="h_inches" className="text-sm font-medium">
                  Inches
                </label>
                <Input
                  id="h_inches"
                  name="inches"
                  type="number"
                  min="0"
                  max="11"
                  defaultValue={inches}
                  required
                />
              </div>
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
                  "Save"
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
// Add Measurement Dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddMeasurementDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addMeasurement,
    initialState,
  );

  useEffect(() => {
    if (state.ok && !pending) {
      setOpen(false);
    }
  }, [state.ok, pending]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
        New Measurement
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Measurements</DialogTitle>
            <DialogDescription>
              BMI is auto-calculated from weight when your height is set.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="m_weight" className="text-sm font-medium">
                  Weight (lbs)
                </label>
                <Input
                  id="m_weight"
                  name="weight_lbs"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0.0"
                />
              </div>
              <div />
              <div className="space-y-2">
                <label htmlFor="m_sys" className="text-sm font-medium">
                  Systolic (mmHg)
                </label>
                <Input
                  id="m_sys"
                  name="systolic_bp"
                  type="number"
                  min="60"
                  max="250"
                  step="1"
                  placeholder="120"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="m_dia" className="text-sm font-medium">
                  Diastolic (mmHg)
                </label>
                <Input
                  id="m_dia"
                  name="diastolic_bp"
                  type="number"
                  min="30"
                  max="150"
                  step="1"
                  placeholder="80"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="m_notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="m_notes"
                name="notes"
                placeholder="Optional notes..."
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
                  "Save"
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
// Measurement Card
// ─────────────────────────────────────────────────────────────────────────────

function MeasurementCard({
  measurement,
  profile,
}: {
  measurement: Measurement;
  profile: HealthProfile;
}) {
  const [state, formAction, pending] = useActionState(
    deleteMeasurement,
    initialState,
  );

  const entries: { label: string; value: string; badge?: string }[] = [];

  if (measurement.weight_kg != null) {
    entries.push({
      label: "Weight",
      value: `${kgToLbs(measurement.weight_kg)} lbs`,
    });
    if (profile.height_in != null) {
      const bmi = calculateBmi(measurement.weight_kg, profile.height_in);
      const category = getBmiCategory(bmi);
      entries.push({
        label: "BMI",
        value: `${bmi}`,
        badge: category,
      });
    }
  }
  if (measurement.systolic_bp != null && measurement.diastolic_bp != null) {
    entries.push({
      label: "Blood Pressure",
      value: `${measurement.systolic_bp}/${measurement.diastolic_bp} mmHg`,
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            {new Date(measurement.measured_at).toLocaleDateString()}
          </CardTitle>
          <form action={formAction}>
            <Input type="hidden" name="id" value={measurement.id} />
            <Button
              type="submit"
              variant="iconDestructive"
              size="icon"
              disabled={pending}
            >
              {pending ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </Button>
          </form>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 text-sm">
          {entries.map((e) => (
            <div key={e.label} className="flex justify-between items-center">
              <span className="text-muted-foreground">{e.label}</span>
              <span className="font-medium flex items-center gap-1.5">
                {e.value}
                {e.badge && (
                  <Badge
                    variant={
                      BMI_CATEGORY_VARIANTS[
                        e.badge as keyof typeof BMI_CATEGORY_VARIANTS
                      ]
                    }
                  >
                    {e.badge}
                  </Badge>
                )}
              </span>
            </div>
          ))}
        </div>
        {measurement.notes && (
          <p className="mt-2 text-xs text-muted-foreground">
            {measurement.notes}
          </p>
        )}
        {!state.ok && (
          <p className="text-sm text-destructive mt-2">{state.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Measurement List
// ─────────────────────────────────────────────────────────────────────────────

export function MeasurementList({
  measurements,
  profile,
}: {
  measurements: Measurement[];
  profile: HealthProfile;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground">
            {measurements.length} records
          </p>
          <HealthProfileDialog profile={profile} />
        </div>
        <AddMeasurementDialog />
      </div>

      {profile.height_in == null && (
        <p className="text-sm text-secondary">
          Set your height to see BMI calculations.
        </p>
      )}

      {measurements.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No measurements recorded yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {measurements.map((m) => (
            <MeasurementCard key={m.id} measurement={m} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
