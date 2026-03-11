"use client";

import { useActionState } from "react";
import { Trash2, Loader } from "lucide-react";
import { deleteWaterLog, type ActionState, type WaterLog } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initialState: ActionState = { ok: true };

function WaterLogRow({ log }: { log: WaterLog }) {
  const [state, formAction, pending] = useActionState(
    deleteWaterLog,
    initialState,
  );

  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-4">
        <span className="font-medium">{log.amount_ml} ml</span>
        <span className="text-sm text-muted-foreground">
          {new Date(log.logged_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <form action={formAction}>
        <Input type="hidden" name="id" value={log.id} />
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
  );
}

export function WaterLogList({ logs }: { logs: WaterLog[] }) {
  const totalMl = logs.reduce((sum, log) => sum + log.amount_ml, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-1">
        <span className="text-2xl font-semibold">{totalMl}</span>
        <span className="text-sm text-muted-foreground mb-0.5">ml today</span>
      </div>

      {logs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No water logged today. Use the dashboard to quick-add.
        </p>
      ) : (
        <div className="space-y-0">
          {logs.map((log) => (
            <WaterLogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </div>
  );
}
