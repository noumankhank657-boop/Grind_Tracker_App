import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Flame, Minus, Plus, Sparkles, Timer } from "lucide-react";
import type { Task } from "@db/schema";
import { ProgressRing } from "@/components/ProgressRing";
import { useCompletions, useLogProgress, useTasks, useToggleCompletion } from "@/hooks/use-tracker";
import { useAccent } from "@/providers/accent";
import { alpha, hexAlpha, hexOf } from "@/lib/colors";
import {
  addDays,
  endOfMonth,
  format,
  formatDeadline,
  formatDuration,
  formatTimeLeft,
  greetingForNow,
  isAfter,
  minutesUntilDeadline,
  SLOT_ORDER,
  toKey,
  todayKey,
  WEEK_ORDER,
} from "@/lib/dates";
import {
  buildCompletionMap,
  dayStat,
  isTaskDone,
  monthStats,
  perfectDayStreak,
  progressFor,
  scheduledFor,
  taskStreak,
} from "@/lib/stats";
import { cn } from "@/lib/utils";

/* ---------- chips ---------- */

function DurationChip({ minutes }: { minutes: number }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
      <Timer className="h-3 w-3" />
      {formatDuration(minutes)}
    </span>
  );
}

function DeadlineChip({
  deadline,
  done,
  now,
}: {
  deadline: string;
  done: boolean;
  now: Date;
}) {
  const left = minutesUntilDeadline(deadline, now);
  if (done) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-secondary/40 px-2 py-0.5 text-[10px] font-bold text-muted-foreground/60">
        <Clock className="h-3 w-3" />
        {formatDeadline(deadline)}
      </span>
    );
  }
  if (left < 0) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
        <Clock className="h-3 w-3" />
        Overdue · {formatDeadline(deadline)}
      </span>
    );
  }
  if (left <= 60) {
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-400">
        <Clock className="h-3 w-3" />
        {formatTimeLeft(left)}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary/60 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
      <Clock className="h-3 w-3" />
      by {formatDeadline(deadline)}
    </span>
  );
}

/* ---------- task row ---------- */

function NumericControl({
  task,
  value,
  done,
  onChange,
}: {
  task: Task;
  value: number;
  done: boolean;
  onChange: (next: number) => void;
}) {
  const target = task.goalTarget ?? 1;
  const hex = hexOf(task.color);
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, value - 1))}
        disabled={value <= 0}
        aria-label={`Decrease ${task.title}`}
        className="flex h-7 w-7 items-center justify-center rounded-lg border-2 border-zinc-500 transition-all hover:border-zinc-400 active:scale-90 disabled:opacity-30"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <div
        className="min-w-[3.5rem] text-center text-sm font-bold"
        style={done ? { color: hex } : undefined}
      >
        {value}
        <span className="text-muted-foreground">
          /{target}
          {task.goalUnit ? ` ${task.goalUnit}` : ""}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${task.title}`}
        className="flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-all active:scale-90"
        style={done ? { backgroundColor: hex, borderColor: hex } : { borderColor: "#71717a" }}
      >
        <Plus className="h-3.5 w-3.5" style={done ? { color: "#09090b" } : undefined} />
      </button>
    </div>
  );
}

function TaskRow({
  task,
  done,
  streak,
  now,
  progress,
  onToggle,
  onLogProgress,
  index,
}: {
  task: Task;
  done: boolean;
  streak: number;
  now: Date;
  progress: number;
  onToggle: () => void;
  onLogProgress: (value: number) => void;
  index: number;
}) {
  const hex = hexOf(task.color);
  const isNumeric = task.goalType === "numeric";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.25 }}
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-border bg-secondary/20 px-4 py-3.5 transition-colors",
        done && "border-transparent bg-secondary/40",
      )}
      style={done ? { boxShadow: `inset 0 0 0 1px ${hexAlpha(task.color, 0.25)}` } : undefined}
    >
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ backgroundColor: hex }} />
      {isNumeric ? (
        <NumericControl task={task} value={progress} done={done} onChange={onLogProgress} />
      ) : (
        <button
          onClick={onToggle}
          aria-label={done ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 transition-all active:scale-90",
            !done && "border-zinc-500 hover:border-zinc-400",
          )}
          style={done ? { backgroundColor: hex, borderColor: hex } : undefined}
        >
          <AnimatePresence>
            {done && (
              <motion.svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.4, opacity: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
              >
                <motion.path
                  d="M5 13l4 4L19 7"
                  fill="none"
                  stroke="#09090b"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.25 }}
                />
              </motion.svg>
            )}
          </AnimatePresence>
        </button>
      )}
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "truncate text-[15px] font-semibold transition-colors",
            done && "text-muted-foreground line-through decoration-2",
          )}
        >
          {task.title}
        </div>
        {task.note && (
          <div className="truncate text-xs text-muted-foreground">{task.note}</div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-1.5">
        {task.durationMin != null && <DurationChip minutes={task.durationMin} />}
        {task.deadline != null && (
          <DeadlineChip deadline={task.deadline} done={done} now={now} />
        )}
        {streak > 0 && (
          <span
            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
            style={{ backgroundColor: hexAlpha("orange", 0.12), color: "#fb923c" }}
            title={`${streak}-day streak`}
          >
            <Flame className="h-3 w-3" />
            {streak}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ---------- section ---------- */

const SLOT_META: Record<string, { label: string; hint: string }> = {
  morning: { label: "Morning", hint: "Start strong" },
  afternoon: { label: "Afternoon", hint: "Keep the momentum" },
  evening: { label: "Evening", hint: "Tonight's focus" },
  anytime: { label: "Anytime", hint: "Whenever it fits" },
};

/** Sort by deadline (earliest first, none last), then routine order. */
function byDeadlineThenOrder(a: Task, b: Task): number {
  if (a.deadline == null && b.deadline == null) return a.sortOrder - b.sortOrder || a.id - b.id;
  if (a.deadline == null) return 1;
  if (b.deadline == null) return -1;
  return a.deadline.localeCompare(b.deadline);
}

/* ---------- page ---------- */

export default function Today() {
  const { accent } = useAccent();
  const [now, setNow] = useState(() => new Date());

  // Keep deadline countdowns / overdue states fresh.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const today = useMemo(() => new Date(), []);
  const rangeStart = toKey(addDays(today, -120));
  const rangeEnd = toKey(endOfMonth(today));

  const tasksQuery = useTasks();
  const completionsQuery = useCompletions(rangeStart, rangeEnd);
  const toggle = useToggleCompletion(rangeStart, rangeEnd);
  const logProgress = useLogProgress(rangeStart, rangeEnd);

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const byDate = useMemo(
    () => buildCompletionMap(completionsQuery.data ?? []),
    [completionsQuery.data],
  );

  const loading = tasksQuery.isLoading || completionsQuery.isLoading;

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 rounded-lg bg-secondary/50" />
        <div className="h-44 rounded-2xl bg-secondary/30" />
        <div className="h-16 rounded-xl bg-secondary/30" />
        <div className="h-16 rounded-xl bg-secondary/30" />
        <div className="h-16 rounded-xl bg-secondary/30" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
        <Flame className="mb-4 h-10 w-10 text-muted-foreground" />
        <h2 className="font-display text-xl font-bold">No routine set up yet</h2>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Head to the Routine screen to define your weekly schedule — the daily checklist builds
          itself from there.
        </p>
        <Link
          to="/setup"
          className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-transform hover:scale-105"
        >
          Set up my routine
        </Link>
      </div>
    );
  }

  const todayTasks = scheduledFor(tasks, today);
  const sections = SLOT_ORDER.map((slot) => ({
    slot,
    tasks: todayTasks.filter((t) => t.slot === slot).sort(byDeadlineThenOrder),
  })).filter((s) => s.tasks.length > 0);

  const todayDateKey = todayKey();
  const stat = dayStat(tasks, byDate, today);
  const streak = perfectDayStreak(tasks, byDate, today);
  const month = monthStats(tasks, byDate, today, today);

  const monday = addDays(today, -((today.getDay() + 6) % 7));
  const weekDays = WEEK_ORDER.map((_, i) => addDays(monday, i));

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            {greetingForNow()}
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {format(today, "EEEE, MMMM d")}
          </h1>
        </div>
        <div className="rounded-full border border-border bg-secondary/30 px-4 py-1.5 text-xs font-medium text-muted-foreground">
          {format(today, "MMMM")} cycle ·{" "}
          <span className="font-bold text-foreground">{month.totalDone}</span> check-offs so far
        </div>
      </div>

      {/* Hero */}
      <div className="mt-6 grid gap-4 md:grid-cols-[auto_1fr]">
        <div
          className={cn(
            "relative flex items-center gap-6 overflow-hidden rounded-2xl border border-border bg-card p-6",
            stat.perfect && "glow-accent",
          )}
          style={stat.perfect ? { borderColor: alpha(accent.hex, 0.5) } : undefined}
        >
          <ProgressRing size={132} stroke={11} progress={stat.pct} color={accent.hex}>
            <div className="font-display text-3xl font-bold">
              {stat.done}
              <span className="text-lg text-muted-foreground">/{stat.total}</span>
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              today
            </div>
          </ProgressRing>
          <div className="space-y-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Perfect-day streak
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 font-display text-2xl font-bold">
                <Flame className={cn("h-5 w-5", streak > 0 ? "text-orange-400" : "text-zinc-500")} />
                {streak} <span className="text-sm font-medium text-muted-foreground">days</span>
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {format(today, "MMMM")} completion
              </div>
              <div className="mt-0.5 font-display text-2xl font-bold">
                {Math.round(month.pct * 100)}
                <span className="text-sm text-muted-foreground">%</span>
              </div>
            </div>
          </div>
          <AnimatePresence>
            {stat.perfect && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Perfect day
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Week strip */}
        <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            This week
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {weekDays.map((d) => {
              const s = dayStat(tasks, byDate, d);
              const isToday = toKey(d) === todayKey();
              const future = isAfter(d, today) && !isToday;
              return (
                <div
                  key={toKey(d)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border py-3 transition-colors",
                    isToday
                      ? "border-primary/60 bg-primary/5"
                      : "border-transparent bg-secondary/20",
                  )}
                >
                  <span
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-wider",
                      isToday ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {format(d, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "font-display text-lg font-bold leading-none",
                      future && "text-muted-foreground/50",
                    )}
                  >
                    {format(d, "d")}
                  </span>
                  <div className="flex h-6 items-end">
                    {s.total > 0 ? (
                      s.perfect ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary">
                          <Check className="h-3.5 w-3.5 text-primary-foreground" strokeWidth={3} />
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                            future ? "bg-secondary/40 text-muted-foreground/50" : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {s.done}/{s.total}
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-muted-foreground/40">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 text-xs text-muted-foreground">
            {stat.perfect
              ? "Every rep logged. Come back tomorrow and defend the streak."
              : `${stat.total - stat.done} task${stat.total - stat.done === 1 ? "" : "s"} left today — keep pushing.`}
          </div>
        </div>
      </div>

      {/* Checklist — morning → afternoon → evening → anytime */}
      {sections.map(({ slot, tasks: sectionTasks }) => (
        <div key={slot}>
          <div className="mb-3 mt-8 flex items-center gap-3">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
              {SLOT_META[slot].label}
              <span className="ml-2 font-medium normal-case tracking-normal text-muted-foreground/60">
                {SLOT_META[slot].hint}
              </span>
            </h2>
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-semibold text-muted-foreground">
              {sectionTasks.filter((t) => isTaskDone(t, byDate, todayDateKey)).length}/
              {sectionTasks.length}
            </span>
          </div>
          <div className="space-y-2.5">
            {sectionTasks.map((task, i) => (
              <TaskRow
                key={task.id}
                task={task}
                index={i}
                done={isTaskDone(task, byDate, todayDateKey)}
                progress={progressFor(task, byDate, todayDateKey)}
                streak={taskStreak(task, byDate, today)}
                now={now}
                onToggle={() => toggle.mutate({ taskId: task.id, date: todayDateKey })}
                onLogProgress={(value) =>
                  logProgress.mutate({ taskId: task.id, date: todayDateKey, value })
                }
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
