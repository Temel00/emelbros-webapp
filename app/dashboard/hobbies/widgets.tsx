"use client";

import { useState, useActionState, useEffect } from "react";
import { Target, Plus, Loader, ArrowLeft, Trash2, Calculator } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  logDartsGame,
  deleteDartsGame,
  getHouseholdMembers,
  type ActionState,
  type DartsGame,
  type DartsSummary,
  type HouseholdMember,
} from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
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

// ─────────────────────────────────────────────────────────────────────────────
// Donut Chart
// ─────────────────────────────────────────────────────────────────────────────

function DartsDonutChart({
  wins,
  losses,
  winPct,
}: {
  wins: number;
  losses: number;
  winPct: number;
}) {
  const total = wins + losses;
  const cx = 50;
  const cy = 50;
  const r = 36;
  const strokeWidth = 12;
  const circumference = 2 * Math.PI * r;

  const pctColor =
    winPct > 50
      ? "var(--color-tertiary)"
      : winPct < 50
        ? "var(--color-destructive)"
        : "white";

  if (total === 0) {
    return (
      <svg viewBox="0 0 100 100" className="w-32 h-32">
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="var(--color-border)"
          strokeWidth={strokeWidth}
        />
        <text
          x={cx}
          y={cy + 4}
          textAnchor="middle"
          fontSize="9"
          fill="currentColor"
          className="text-muted-foreground"
        >
          No games
        </text>
      </svg>
    );
  }

  const winDash = circumference * (wins / total);
  const offset = circumference * 0.25; // start from top (12 o'clock)

  return (
    <svg viewBox="0 0 100 100" className="w-32 h-32">
      {/* Loss arc (full circle background) */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-destructive)"
        strokeWidth={strokeWidth}
      />
      {/* Win arc */}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="var(--color-tertiary)"
        strokeWidth={strokeWidth}
        strokeDasharray={`${winDash} ${circumference - winDash}`}
        strokeDashoffset={offset}
      />
      {/* Win % label */}
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fill={pctColor}
      >
        {winPct}%
      </text>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Darts Score Calculator
// ─────────────────────────────────────────────────────────────────────────────

type DartThrow = {
  number: number;
  multiplier: 1 | 2 | 3;
  value: number;
  label: string;
};

type CompletedRound = {
  scoreBefore: number;
  darts: DartThrow[];
  scoreAfter: number;
  bust: boolean;
  roundDeducted: number;
};

type PlayerState = {
  roundStart: number;
  currentDarts: DartThrow[];
  history: CompletedRound[];
  gameOver: boolean;
};

function makePlayer(score: number): PlayerState {
  return { roundStart: score, currentDarts: [], history: [], gameOver: false };
}

function dartLabel(num: number, mult: 1 | 2 | 3): string {
  if (num === 0) return "MISS";
  if (num === 25 && mult >= 2) return "BULL50";
  if (num === 25) return "BULL25";
  const prefix = mult === 1 ? "S" : mult === 2 ? "D" : "T";
  return `${prefix}${num}`;
}

function DartsCalculatorDialog() {
  const [open, setOpen] = useState(false);
  const [startingScore, setStartingScore] = useState(301);
  const [customInput, setCustomInput] = useState("");
  const [twoPlayer, setTwoPlayer] = useState(false);
  const [playerNames, setPlayerNames] = useState<[string, string]>(["Player 1", "Player 2"]);
  const [players, setPlayers] = useState<PlayerState[]>([makePlayer(301)]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [winner, setWinner] = useState<number | null>(null);

  const ap = players[activeIdx] ?? makePlayer(startingScore);

  function startNewGame(score: number = startingScore) {
    setStartingScore(score);
    setCustomInput("");
    setPlayers(Array.from({ length: twoPlayer ? 2 : 1 }, () => makePlayer(score)));
    setActiveIdx(0);
    setMultiplier(1);
    setWinner(null);
  }

  function toggleTwoPlayer() {
    const next = !twoPlayer;
    setTwoPlayer(next);
    setPlayers(
      next ? [makePlayer(startingScore), makePlayer(startingScore)] : [makePlayer(startingScore)],
    );
    setActiveIdx(0);
    setMultiplier(1);
    setWinner(null);
  }

  function commitRound(newDarts: DartThrow[], pState: PlayerState) {
    const roundTotal = newDarts.reduce((sum, d) => sum + d.value, 0);
    const newScore = pState.roundStart - roundTotal;
    const bust = newScore < 0;
    const won = newScore === 0;

    const round: CompletedRound = {
      scoreBefore: pState.roundStart,
      darts: newDarts,
      scoreAfter: bust ? pState.roundStart : newScore,
      bust,
      roundDeducted: bust ? 0 : roundTotal,
    };

    const idx = activeIdx;
    setPlayers((prev) => {
      const next = [...prev];
      next[idx] = {
        roundStart: bust ? pState.roundStart : newScore,
        currentDarts: [],
        history: [round, ...pState.history],
        gameOver: won,
      };
      return next;
    });

    if (won) {
      setWinner(idx);
    } else if (twoPlayer) {
      setActiveIdx(idx === 0 ? 1 : 0);
    }
    setMultiplier(1);
  }

  function throwDart(num: number) {
    if (winner !== null || ap.gameOver || ap.currentDarts.length >= 3) return;

    const mult: 1 | 2 | 3 = num === 25 && multiplier === 3 ? 2 : multiplier;
    const value = num * mult;
    const dart: DartThrow = { number: num, multiplier: mult, value, label: dartLabel(num, mult) };
    const newDarts = [...ap.currentDarts, dart];
    const roundTotal = newDarts.reduce((sum, d) => sum + d.value, 0);
    const newScore = ap.roundStart - roundTotal;

    if (newScore < 0 || newScore === 0 || newDarts.length >= 3) {
      commitRound(newDarts, ap);
    } else {
      setPlayers((prev) => {
        const next = [...prev];
        next[activeIdx] = { ...prev[activeIdx], currentDarts: newDarts };
        return next;
      });
    }
  }

  function undoLastDart() {
    setPlayers((prev) => {
      const next = [...prev];
      next[activeIdx] = {
        ...prev[activeIdx],
        currentDarts: prev[activeIdx].currentDarts.slice(0, -1),
      };
      return next;
    });
  }

  function endRoundEarly() {
    if (ap.currentDarts.length === 0) return;
    commitRound(ap.currentDarts, ap);
  }

  function revertToRound(playerIdx: number, roundIdx: number) {
    const p = players[playerIdx];
    if (!p) return;
    const round = p.history[roundIdx];
    if (!round) return;
    setPlayers((prev) => {
      const next = [...prev];
      next[playerIdx] = {
        ...prev[playerIdx],
        roundStart: round.scoreBefore,
        currentDarts: [],
        history: p.history.slice(roundIdx + 1),
        gameOver: false,
      };
      return next;
    });
    setWinner(null);
  }

  function handleCustomStart() {
    const val = parseInt(customInput, 10);
    if (val > 0) startNewGame(val);
  }

  const currentRoundTotal = ap.currentDarts.reduce((sum, d) => sum + d.value, 0);
  const projectedScore = ap.roundStart - currentRoundTotal;
  const isBust = projectedScore < 0;
  const dartInputDisabled = winner !== null || ap.gameOver || ap.currentDarts.length >= 3;

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <Calculator className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Darts Calculator
            </DialogTitle>
            <DialogDescription>Track your score during a game</DialogDescription>
          </DialogHeader>

          {/* Game mode selector */}
          <div className="flex gap-2 items-center">
            {([301, 501] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => startNewGame(mode)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                  startingScore === mode && winner === null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-input hover:bg-accent/10",
                )}
              >
                {mode}
              </button>
            ))}
            <div className="flex flex-1 gap-1">
              <Input
                type="number"
                placeholder="Custom"
                value={customInput}
                min={1}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCustomStart()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCustomStart}
                disabled={!customInput || parseInt(customInput) < 1}
              >
                Go
              </Button>
            </div>
          </div>

          {/* Two-player toggle + names */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={toggleTwoPlayer}
              className={cn(
                "w-full rounded-md border py-1.5 text-xs font-medium transition-colors",
                twoPlayer
                  ? "bg-secondary/40 border-secondary text-foreground"
                  : "border-input hover:bg-accent/10 text-muted-foreground",
              )}
            >
              {twoPlayer ? "2-Player Mode ✓" : "Enable 2-Player Mode"}
            </button>
            {twoPlayer && (
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={playerNames[0]}
                  onChange={(e) => setPlayerNames([e.target.value, playerNames[1]])}
                  placeholder="Player 1"
                  className="text-xs"
                />
                <Input
                  value={playerNames[1]}
                  onChange={(e) => setPlayerNames([playerNames[0], e.target.value])}
                  placeholder="Player 2"
                  className="text-xs"
                />
              </div>
            )}
          </div>

          {/* Score display */}
          {twoPlayer ? (
            <div className="grid grid-cols-2 gap-2">
              {players.map((p, i) => {
                const isActive = i === activeIdx;
                const pRoundTotal = p.currentDarts.reduce((s, d) => s + d.value, 0);
                const pProjected = p.roundStart - pRoundTotal;
                const pBust = pProjected < 0;
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg p-3 text-center transition-colors",
                      winner === i
                        ? "bg-tertiary/10"
                        : pBust
                          ? "bg-destructive/10"
                          : isActive
                            ? "bg-accent/20 ring-1 ring-accent/40"
                            : "bg-muted/30",
                    )}
                  >
                    <p
                      className={cn(
                        "text-xs font-medium mb-1",
                        isActive ? "text-accent" : "text-muted-foreground",
                      )}
                    >
                      {playerNames[i]}
                      {isActive && " ←"}
                    </p>
                    {winner === i ? (
                      <p className="text-tertiary font-bold text-lg">WIN!</p>
                    ) : (
                      <p className={cn("text-2xl font-bold", pBust && "text-destructive")}>
                        {pBust ? "BUST" : pProjected}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className={cn(
                "rounded-lg p-4 text-center",
                winner !== null ? "bg-tertiary/10" : isBust ? "bg-destructive/10" : "bg-accent/10",
              )}
            >
              {winner !== null ? (
                <>
                  <p className="text-tertiary font-bold text-3xl">WINNER!</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Finished in {ap.history.length} rounds
                  </p>
                </>
              ) : (
                <>
                  <p className={cn("text-4xl font-bold", isBust && "text-destructive")}>
                    {isBust ? "BUST" : projectedScore}
                  </p>
                  {currentRoundTotal > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      This round: −{currentRoundTotal}
                      {isBust && " · over!"}
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {/* Current round dart slots */}
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => {
              const dart = ap.currentDarts[i];
              return (
                <div
                  key={i}
                  className={cn(
                    "flex-1 h-8 rounded border flex items-center justify-center text-xs font-medium",
                    dart
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "border-dashed border-input text-muted-foreground",
                  )}
                >
                  {dart ? dart.label : "—"}
                </div>
              );
            })}
          </div>

          {/* Multiplier selector */}
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMultiplier(m)}
                className={cn(
                  "flex-1 rounded-md border py-1.5 text-xs font-medium transition-colors",
                  multiplier === m
                    ? "bg-accent text-white border-accent"
                    : "border-input hover:bg-accent/10",
                )}
              >
                {m === 1 ? "Single" : m === 2 ? "Double" : "Triple"}
              </button>
            ))}
          </div>

          {/* Number grid 1–20 */}
          <div className="grid grid-cols-5 gap-1">
            {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
              <button
                key={num}
                type="button"
                onClick={() => throwDart(num)}
                disabled={dartInputDisabled}
                className={cn(
                  "rounded border py-2 text-sm font-medium transition-colors",
                  "border-input hover:bg-primary/10 hover:border-primary/40",
                  "disabled:opacity-40 disabled:cursor-not-allowed",
                )}
              >
                {num}
              </button>
            ))}
          </div>

          {/* Bull + Miss row */}
          <div className="grid grid-cols-5 gap-1">
            <button
              type="button"
              onClick={() => throwDart(25)}
              disabled={dartInputDisabled}
              className={cn(
                "col-span-3 rounded border py-2 text-xs font-medium transition-colors",
                "border-input hover:bg-primary/10 hover:border-primary/40",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              {multiplier >= 2 ? "BULL (50)" : "BULL (25)"}
            </button>
            <button
              type="button"
              onClick={() => throwDart(0)}
              disabled={dartInputDisabled}
              className={cn(
                "col-span-2 rounded border py-2 text-xs font-medium transition-colors",
                "border-input hover:bg-accent/10 text-muted-foreground",
                "disabled:opacity-40 disabled:cursor-not-allowed",
              )}
            >
              MISS
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={undoLastDart}
              disabled={ap.currentDarts.length === 0}
              className="flex-1"
            >
              Undo
            </Button>
            {ap.currentDarts.length > 0 && ap.currentDarts.length < 3 && (
              <Button variant="outline" size="sm" onClick={endRoundEarly} className="flex-1">
                End Round
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => startNewGame()} className="flex-1">
              New Game
            </Button>
          </div>

          {/* Round history — one section per player */}
          {(twoPlayer ? players : [players[0]]).map((p, pi) => {
            if (!p || p.history.length === 0) return null;
            return (
              <div key={pi} className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">
                  {twoPlayer ? `${playerNames[pi]} — ` : ""}Round History
                  <span className="ml-1 opacity-60">(click to revert)</span>
                </p>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {p.history.map((round, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => revertToRound(pi, i)}
                      className={cn(
                        "w-full flex items-center justify-between text-xs px-2 py-1 rounded gap-2 transition-colors",
                        round.bust
                          ? "bg-destructive/10 hover:bg-destructive/20"
                          : "bg-muted/30 hover:bg-muted/50",
                      )}
                    >
                      <span className="text-muted-foreground shrink-0">R{p.history.length - i}</span>
                      <span className="flex gap-1.5 flex-1 flex-wrap text-left">
                        {round.darts.map((d, j) => (
                          <span
                            key={j}
                            className={cn(
                              "font-medium",
                              round.bust ? "text-destructive" : "text-foreground",
                            )}
                          >
                            {d.label}
                          </span>
                        ))}
                      </span>
                      <span
                        className={cn(
                          "font-semibold shrink-0",
                          round.bust ? "text-destructive" : "text-tertiary",
                        )}
                      >
                        {round.bust ? "BUST" : `→ ${round.scoreAfter}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Log Game Dialog
// ─────────────────────────────────────────────────────────────────────────────

function LogGameDialog() {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<"win" | "loss" | null>(null);
  const [opponentName, setOpponentName] = useState("");
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [state, formAction, pending] = useActionState(logDartsGame, initialState);

  useEffect(() => {
    if (!open) return;
    getHouseholdMembers()
      .then(setMembers)
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (state.ok && !pending) {
      setOpen(false);
      setResult(null);
      setOpponentName("");
    }
  }, [state.ok, pending]);

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Darts Game</DialogTitle>
            <DialogDescription>Record the result of a darts game.</DialogDescription>
          </DialogHeader>

          <form action={formAction} className="space-y-4">
            <Input type="hidden" name="result" value={result ?? ""} />

            <div className="space-y-2">
              <p className="text-sm font-medium">Result</p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setResult("win")}
                  className={cn(
                    "flex-1 rounded-md border py-2 text-sm font-medium transition-colors",
                    result === "win"
                      ? "bg-tertiary text-white border-tertiary"
                      : "border-input hover:bg-accent/10",
                  )}
                >
                  Win
                </button>
                <button
                  type="button"
                  onClick={() => setResult("loss")}
                  className={cn(
                    "flex-1 rounded-md border py-2 text-sm font-medium transition-colors",
                    result === "loss"
                      ? "bg-destructive text-white border-destructive"
                      : "border-input hover:bg-accent/10",
                  )}
                >
                  Loss
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="opponent_name" className="text-sm font-medium">
                Opponent (optional)
              </label>
              {members.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {members.map((m) => {
                    const name = m.display_name ?? m.email;
                    const selected = opponentName === name;
                    return (
                      <button
                        key={m.user_id}
                        type="button"
                        onClick={() => setOpponentName(selected ? "" : name)}
                        className={cn(
                          "rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
                          selected
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-input hover:bg-accent/10",
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              )}
              <Input
                id="opponent_name"
                name="opponent_name"
                placeholder="Opponent name"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="notes" className="text-sm font-medium">
                Notes (optional)
              </label>
              <Input id="notes" name="notes" placeholder="Any notes..." />
            </div>

            {!state.ok && <p className="text-sm text-destructive">{state.error}</p>}

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit" disabled={pending || result === null}>
                {pending ? <Loader className="w-4 h-4 animate-spin" /> : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Darts Card (flip)
// ─────────────────────────────────────────────────────────────────────────────

function DartsCard({
  summary,
  games,
}: {
  summary: DartsSummary;
  games: DartsGame[];
}) {
  const [flipped, setFlipped] = useState(false);
  const { wins, losses, total, winPct } = summary;

  return (
    <div style={{ perspective: "1000px", minHeight: "272px" }} className="relative">
      {/* Rotating wrapper */}
      <div
        className="absolute inset-0"
        style={{
          transformStyle: "preserve-3d",
          transition: "transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* ── Front ── */}
        <div className="absolute inset-0" style={{ backfaceVisibility: "hidden" }}>
          <Card
            className="h-full cursor-pointer hover:border-primary/50 transition-colors flex flex-col"
            onClick={() => setFlipped(true)}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <CardTitle>Darts</CardTitle>
                </div>
                {/* Stop propagation so buttons don't flip the card */}
                <div onClick={(e) => e.stopPropagation()}>
                  <LogGameDialog />
                </div>
              </div>
              <CardDescription>Career record · click to manage</CardDescription>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="flex items-center gap-6">
                <DartsDonutChart wins={wins} losses={losses} winPct={winPct} />

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--color-tertiary)" }}
                    />
                    <span className="text-muted-foreground">Wins</span>
                    <span className="font-semibold ml-1">{wins}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full"
                      style={{ background: "var(--color-destructive)" }}
                    />
                    <span className="text-muted-foreground">Losses</span>
                    <span className="font-semibold ml-1">{losses}</span>
                  </div>
                  <div className="pt-1 border-t text-muted-foreground">
                    <span className="font-medium text-foreground">{total}</span>{" "}
                    games played
                  </div>
                </div>
              </div>
            </CardContent>
            {/* Calculator trigger — bottom-left, stops card flip */}
            <div className="px-2 pb-2" onClick={(e) => e.stopPropagation()}>
              <DartsCalculatorDialog />
            </div>
          </Card>
        </div>

        {/* ── Back ── */}
        <div
          className="absolute inset-0"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <Card className="h-full flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setFlipped(false)}
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <CardTitle>Game History</CardTitle>
                </div>
                <span className="text-xs text-muted-foreground">
                  {total} games
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto">
              {games.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No games logged yet.
                </p>
              ) : (
                <ul className="space-y-0">
                  {games.map((game) => (
                    <li
                      key={game.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="shrink-0 text-xs font-bold w-5 text-center"
                          style={{
                            color:
                              game.result === "win"
                                ? "var(--color-tertiary)"
                                : "var(--color-destructive)",
                          }}
                        >
                          {game.result === "win" ? "W" : "L"}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm truncate">
                            {game.opponent_name ?? (
                              <span className="text-muted-foreground italic">
                                Unknown
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(game.played_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <form action={deleteDartsGame}>
                        <Input type="hidden" name="id" value={game.id} />
                        <Button variant="iconDestructive" size="icon" type="submit">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Export
// ─────────────────────────────────────────────────────────────────────────────

export function HobbiesDashboard({
  dartsSummary,
  dartsGames,
}: {
  dartsSummary: DartsSummary;
  dartsGames: DartsGame[];
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <DartsCard summary={dartsSummary} games={dartsGames} />
    </div>
  );
}
