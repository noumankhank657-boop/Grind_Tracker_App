import type { Completion, Task } from "@db/schema";
import {
  addDays,
  getDay,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameMonth,
  startOfMonth,
  toKey,
} from "@/lib/dates";

/** date key → taskId → logged value (null for checkbox-style completions) */
export type CompletionMap = Map<string, Map<number, number | null>>;

export function buildCompletionMap(rows: Completion[]): CompletionMap {
  const map: CompletionMap = new Map();
  for (const row of rows) {
    let inner = map.get(row.date);
    if (!inner) {
      inner = new Map();
      map.set(row.date, inner);
    }
    inner.set(row.taskId, row.value ?? null);
  }
  return map;
}

/**
 * A task counts as "done" on a date when:
 * - checkbox tasks: a completion row exists at all
 * - numeric tasks: a completion row exists AND its value meets goalTarget
 */
export function isTaskDone(task: Task, byDate: CompletionMap, dateKey: string): boolean {
  const entry = byDate.get(dateKey)?.get(task.id);
  if (entry === undefined) return false;
  if (task.goalType === "numeric") {
    return (entry ?? 0) >= (task.goalTarget ?? 1);
  }
  return true;
}

/** Current logged progress for a numeric task on a date (0 if none logged). */
export function progressFor(task: Task, byDate: CompletionMap, dateKey: string): number {
  return byDate.get(dateKey)?.get(task.id) ?? 0;
}

/** Tasks scheduled on a given calendar date (by weekday). */
export function scheduledFor(tasks: Task[], date: Date): Task[] {
  const weekday = getDay(date);
  return tasks.filter((t) => t.days.includes(weekday));
}

export interface DayStat {
  done: number;
  total: number;
  pct: number; // 0–1; 0 when nothing scheduled
  perfect: boolean;
}

export function dayStat(tasks: Task[], byDate: CompletionMap, date: Date): DayStat {
  const scheduled = scheduledFor(tasks, date);
  const dateKey = toKey(date);
  const done = scheduled.filter((t) => isTaskDone(t, byDate, dateKey)).length;
  const total = scheduled.length;
  const pct = total === 0 ? 0 : done / total;
  return { done, total, pct, perfect: total > 0 && done === total };
}

/**
 * Consecutive perfect days ending today (or yesterday if today isn't done yet —
 * an unfinished today never breaks a live streak).
 */
export function perfectDayStreak(tasks: Task[], byDate: CompletionMap, today: Date): number {
  let streak = 0;
  let cursor = today;
  if (!dayStat(tasks, byDate, cursor).perfect) {
    cursor = addDays(cursor, -1);
  }
  while (true) {
    const stat = dayStat(tasks, byDate, cursor);
    if (stat.total === 0) {
      // No tasks scheduled that day — neutral, keep walking back.
      cursor = addDays(cursor, -1);
      if (isBefore(cursor, addDays(today, -400))) break;
      continue;
    }
    if (!stat.perfect) break;
    streak += 1;
    cursor = addDays(cursor, -1);
    if (isBefore(cursor, addDays(today, -400))) break;
  }
  return streak;
}

/** Per-task streak: consecutive scheduled days completed (today pending is neutral). */
export function taskStreak(task: Task, byDate: CompletionMap, today: Date): number {
  let streak = 0;
  let cursor = today;
  const doneToday = isTaskDone(task, byDate, toKey(cursor));
  if (task.days.includes(getDay(cursor)) && !doneToday) {
    cursor = addDays(cursor, -1);
  }
  while (true) {
    if (!task.days.includes(getDay(cursor))) {
      cursor = addDays(cursor, -1);
      if (isBefore(cursor, addDays(today, -400))) break;
      continue;
    }
    if (!isTaskDone(task, byDate, toKey(cursor))) break;
    streak += 1;
    cursor = addDays(cursor, -1);
    if (isBefore(cursor, addDays(today, -400))) break;
  }
  return streak;
}

/** Days of a month that count toward stats: elapsed days only. */
export function countableDaysInMonth(month: Date, today: Date): Date[] {
  if (isAfter(startOfMonth(month), today)) return [];
  const total = getDaysInMonth(month);
  const lastDay = isSameMonth(month, today) ? today.getDate() : total;
  const days: Date[] = [];
  for (let d = 1; d <= lastDay; d++) {
    days.push(new Date(month.getFullYear(), month.getMonth(), d));
  }
  return days;
}

export interface TaskMonthStat {
  task: Task;
  done: number;
  scheduled: number;
  pct: number;
}

export interface MonthStats {
  perTask: TaskMonthStat[];
  totalDone: number;
  totalScheduled: number;
  pct: number;
  perfectDays: number;
  bestStreak: number;
  days: { date: Date; stat: DayStat }[];
}

export function monthStats(
  tasks: Task[],
  byDate: CompletionMap,
  month: Date,
  today: Date,
): MonthStats {
  const days = countableDaysInMonth(month, today).map((date) => ({
    date,
    stat: dayStat(tasks, byDate, date),
  }));

  const perTask: TaskMonthStat[] = tasks.map((task) => {
    let scheduled = 0;
    let done = 0;
    for (const { date } of days) {
      if (task.days.includes(getDay(date))) {
        scheduled += 1;
        if (isTaskDone(task, byDate, toKey(date))) done += 1;
      }
    }
    return { task, done, scheduled, pct: scheduled === 0 ? 0 : done / scheduled };
  });

  const totalScheduled = days.reduce((n, d) => n + d.stat.total, 0);
  const totalDone = days.reduce((n, d) => n + d.stat.done, 0);
  const perfectDays = days.filter((d) => d.stat.perfect).length;

  let bestStreak = 0;
  let run = 0;
  for (const d of days) {
    if (d.stat.perfect) {
      run += 1;
      bestStreak = Math.max(bestStreak, run);
    } else {
      run = 0;
    }
  }

  return {
    perTask,
    totalDone,
    totalScheduled,
    pct: totalScheduled === 0 ? 0 : totalDone / totalScheduled,
    perfectDays,
    bestStreak,
    days,
  };
}

export interface YearMonthBucket {
  month: Date;
  label: string;
  done: number;
  scheduled: number;
  pct: number;
  perfectDays: number;
}

export interface YearStats {
  months: YearMonthBucket[];
  perTask: TaskMonthStat[];
  totalDone: number;
  totalScheduled: number;
  pct: number;
  perfectDays: number;
  bestMonth: YearMonthBucket | null;
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

export function yearStats(
  tasks: Task[],
  byDate: CompletionMap,
  year: Date,
  today: Date,
): YearStats {
  const months: YearMonthBucket[] = [];
  for (let m = 0; m < 12; m++) {
    const monthDate = new Date(year.getFullYear(), m, 1);
    if (isAfter(startOfMonth(monthDate), today) && !isSameMonth(monthDate, today)) {
      months.push({
        month: monthDate,
        label: MONTH_LABELS[m],
        done: 0,
        scheduled: 0,
        pct: 0,
        perfectDays: 0,
      });
      continue;
    }
    const stats = monthStats(tasks, byDate, monthDate, today);
    months.push({
      month: monthDate,
      label: MONTH_LABELS[m],
      done: stats.totalDone,
      scheduled: stats.totalScheduled,
      pct: stats.pct,
      perfectDays: stats.perfectDays,
    });
  }

  const perTask: TaskMonthStat[] = tasks.map((task) => {
    let scheduled = 0;
    let done = 0;
    for (const bucket of months) {
      const days = countableDaysInMonth(bucket.month, today);
      for (const date of days) {
        if (task.days.includes(getDay(date))) {
          scheduled += 1;
          if (isTaskDone(task, byDate, toKey(date))) done += 1;
        }
      }
    }
    return { task, done, scheduled, pct: scheduled === 0 ? 0 : done / scheduled };
  });

  const totalDone = months.reduce((n, m) => n + m.done, 0);
  const totalScheduled = months.reduce((n, m) => n + m.scheduled, 0);
  const perfectDays = months.reduce((n, m) => n + m.perfectDays, 0);
  const elapsed = months.filter((m) => m.scheduled > 0);
  const bestMonth =
    elapsed.length === 0
      ? null
      : elapsed.reduce((best, m) => (m.pct > best.pct ? m : best), elapsed[0]);

  return {
    months,
    perTask,
    totalDone,
    totalScheduled,
    pct: totalScheduled === 0 ? 0 : totalDone / totalScheduled,
    perfectDays,
    bestMonth,
  };
}
