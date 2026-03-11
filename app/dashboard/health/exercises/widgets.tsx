"use client";

import { useState, useActionState, useEffect } from "react";
import { Trash2, Loader, Plus } from "lucide-react";
import {
  addExercise,
  deleteExercise,
  type ActionState,
  type Exercise,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

const initialState: ActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Add Exercise Dialog
// ─────────────────────────────────────────────────────────────────────────────

function AddExerciseDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addExercise,
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
        Log Exercise
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Exercise</DialogTitle>
            <DialogDescription>
              Record an exercise you performed.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="ex_name" className="text-sm font-medium">
                Exercise Name
              </label>
              <Input
                id="ex_name"
                name="name"
                placeholder="e.g. Push-ups, Running"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label
                  htmlFor="ex_duration"
                  className="text-sm font-medium"
                >
                  Duration (min)
                </label>
                <Input
                  id="ex_duration"
                  name="duration_minutes"
                  type="number"
                  min="0"
                  placeholder="30"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="ex_weight" className="text-sm font-medium">
                  Weight (kg)
                </label>
                <Input
                  id="ex_weight"
                  name="weight_kg"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="ex_sets" className="text-sm font-medium">
                  Sets
                </label>
                <Input
                  id="ex_sets"
                  name="sets"
                  type="number"
                  min="0"
                  placeholder="3"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="ex_reps" className="text-sm font-medium">
                  Reps
                </label>
                <Input
                  id="ex_reps"
                  name="reps"
                  type="number"
                  min="0"
                  placeholder="10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="ex_notes" className="text-sm font-medium">
                Notes
              </label>
              <Input
                id="ex_notes"
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
// Exercise Row
// ─────────────────────────────────────────────────────────────────────────────

function ExerciseRow({ exercise }: { exercise: Exercise }) {
  const [state, formAction, pending] = useActionState(
    deleteExercise,
    initialState,
  );

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex flex-col gap-1">
        <span className="font-medium">{exercise.name}</span>
        <div className="flex flex-wrap gap-1">
          {exercise.duration_minutes && (
            <Badge variant="outline">{exercise.duration_minutes} min</Badge>
          )}
          {exercise.sets && exercise.reps && (
            <Badge variant="outline">
              {exercise.sets} x {exercise.reps}
            </Badge>
          )}
          {exercise.weight_kg && (
            <Badge variant="outline">{exercise.weight_kg} kg</Badge>
          )}
        </div>
        {exercise.notes && (
          <span className="text-xs text-muted-foreground">
            {exercise.notes}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          {new Date(exercise.performed_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        <form action={formAction}>
          <Input type="hidden" name="id" value={exercise.id} />
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
        {!state.ok && (
          <p className="text-sm text-destructive">{state.error}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Exercise List
// ─────────────────────────────────────────────────────────────────────────────

export function ExerciseList({ exercises }: { exercises: Exercise[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex items-end gap-1">
          <span className="text-2xl font-semibold">{exercises.length}</span>
          <span className="text-sm text-muted-foreground mb-0.5">
            exercises today
          </span>
        </div>
        <AddExerciseDialog />
      </div>

      {exercises.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No exercises logged today.
        </p>
      ) : (
        <div className="space-y-0">
          {exercises.map((ex) => (
            <ExerciseRow key={ex.id} exercise={ex} />
          ))}
        </div>
      )}
    </div>
  );
}
