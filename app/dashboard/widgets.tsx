"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import { WashingMachine, Loader, CalendarCheck, Check, X } from "lucide-react";

import { triggerLaundry, triggerWebhook, type ActionState } from "./actions";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const LAUNDRY_STAGES = ["Washing", "Drying", "Folding"] as const;

const initialState: ActionState = { ok: true };

// ─────────────────────────────────────────────────────────────────────────────
// Laundry Dialog
// ─────────────────────────────────────────────────────────────────────────────

function LaundryDialog() {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<string>("");
  const [state, formAction, pending] = useActionState(
    triggerLaundry,
    initialState,
  );
  const hasSubmitted = useRef(false);

  useEffect(() => {
    if (pending) {
      hasSubmitted.current = true;
    }
  }, [pending]);

  useEffect(() => {
    if (hasSubmitted.current && state.ok && !pending) {
      hasSubmitted.current = false;
      setOpen(false);
      setStage("");
    }
  }, [state.ok, pending]);

  function handleOpenChange(next: boolean) {
    console.log("testing: " + next);
    setOpen(next);
    if (next) {
      setStage("");
    }
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleOpenChange(true)}
            >
              <WashingMachine className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Laundry</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Laundry Stage</DialogTitle>
            <DialogDescription>
              Select which stage of the laundry you are completing.
            </DialogDescription>
          </DialogHeader>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="stage" value={stage} />
            <RadioGroup value={stage} onValueChange={setStage}>
              {LAUNDRY_STAGES.map((s) => (
                <div key={s} className="flex items-center gap-2">
                  <RadioGroupItem value={s} id={`stage-${s}`} />
                  <label htmlFor={`stage-${s}`} className="text-sm font-medium">
                    {s}
                  </label>
                </div>
              ))}
            </RadioGroup>

            {!state.ok && (
              <p className="text-sm text-destructive">{state.error}</p>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending || !stage}>
                {pending ? <Loader className="w-4 h-4 animate-spin" /> : "OK"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Webhook Button (reusable, no dialog)
// ─────────────────────────────────────────────────────────────────────────────

type WebhookButtonConfig = {
  flow: string;
  envKey: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  label: string;
};

function WebhookButton({ flow, envKey, icon: Icon, label }: WebhookButtonConfig) {
  const [state, formAction, pending] = useActionState(
    triggerWebhook,
    initialState,
  );
  const hasSubmitted = useRef(false);
  const [feedback, setFeedback] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    if (pending) {
      hasSubmitted.current = true;
    }
  }, [pending]);

  useEffect(() => {
    if (hasSubmitted.current && !pending) {
      hasSubmitted.current = false;
      setFeedback(state.ok ? "success" : "error");
      const timer = setTimeout(() => setFeedback(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.ok, pending]);

  const displayIcon = pending ? (
    <Loader className="w-4 h-4 animate-spin" />
  ) : feedback === "success" ? (
    <Check className="w-4 h-4 text-tertiary" />
  ) : feedback === "error" ? (
    <X className="w-4 h-4 text-destructive" />
  ) : (
    <Icon className="w-4 h-4" />
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <form action={formAction}>
            <input type="hidden" name="flow" value={flow} />
            <input type="hidden" name="envKey" value={envKey} />
            <Button
              type="submit"
              variant="outline"
              size="icon"
              disabled={pending}
            >
              {displayIcon}
            </Button>
          </form>
        </TooltipTrigger>
        <TooltipContent>
          <p>{feedback === "error" ? state.error : label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Toolbox
// ─────────────────────────────────────────────────────────────────────────────

export function Toolbox() {
  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Toolbox</h2>
      <div className="flex flex-wrap gap-2">
        <LaundryDialog />
        <WebhookButton
          flow="plan_tomorrow"
          envKey="PLANTOMORROW_WEBHOOK_URL"
          icon={CalendarCheck}
          label="Plan Tomorrow"
        />
      </div>
    </div>
  );
}
