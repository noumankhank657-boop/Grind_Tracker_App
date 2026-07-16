import {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  getDay,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameMonth,
  isSameYear,
  isToday,
  startOfMonth,
  startOfYear,
} from "date-fns";

/** Local YYYY-MM-DD key — matches the `date` column in the completions table. */
export const toKey = (d: Date): string => format(d, "yyyy-MM-dd");
export const todayKey = (): string => toKey(new Date());

export {
  addDays,
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  getDay,
  getDaysInMonth,
  isAfter,
  isBefore,
  isSameMonth,
  isSameYear,
  isToday,
  startOfMonth,
  startOfYear,
};

/** Display order for day pickers / weekly grids: Monday first. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function greetingForNow(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still grinding";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

/* ---------- deadline & duration helpers ---------- */

/** "18:30" → "6:30 PM" */
export function formatDeadline(deadline: string): string {
  const [h, m] = deadline.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

/** 45 → "45m" · 60 → "1h" · 90 → "1h 30m" */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Minutes from `now` until today's deadline (negative = overdue). */
export function minutesUntilDeadline(deadline: string, now: Date): number {
  const [h, m] = deadline.split(":").map(Number);
  const due = new Date(now);
  due.setHours(h, m, 0, 0);
  return Math.round((due.getTime() - now.getTime()) / 60000);
}

/** 75 → "1h 15m left" · 42 → "42m left" */
export function formatTimeLeft(minutes: number): string {
  return `${formatDuration(minutes)} left`;
}

/** Section order for the daily checklist: morning → afternoon → evening → anytime. */
export const SLOT_ORDER = ["morning", "afternoon", "evening", "anytime"] as const;
