/**
 * Shared constants for the weekly routine — used by both the API (seeding)
 * and the frontend (labels, colors, day pickers).
 *
 * Day numbering follows JS Date.getDay(): 0 = Sunday ... 6 = Saturday.
 */

export const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const DAY_LONG = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6] as const;

export type TaskSlot = "anytime" | "morning" | "afternoon" | "evening";

export const SLOT_LABELS: Record<TaskSlot, string> = {
  anytime: "Anytime",
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
};

export interface DefaultTask {
  title: string;
  note: string;
  slot: TaskSlot;
  days: number[];
  color: string;
  sortOrder: number;
}

/** The user's weekly routine, seeded on first run. */
export const DEFAULT_ROUTINE: DefaultTask[] = [
  {
    title: "Sales Training",
    note: "Sharpen the pitch — every single day",
    slot: "anytime",
    days: [...EVERY_DAY],
    color: "amber",
    sortOrder: 0,
  },
  {
    title: "Content Creation",
    note: "Goal: publish 1 video a day",
    slot: "anytime",
    days: [...EVERY_DAY],
    color: "rose",
    sortOrder: 1,
  },
  {
    title: "Household Chores",
    note: "Keep the space in order",
    slot: "anytime",
    days: [...EVERY_DAY],
    color: "teal",
    sortOrder: 2,
  },
  {
    title: "AI & Data Science Course",
    note: "Evening deep work — Mon / Wed / Fri",
    slot: "evening",
    days: [1, 3, 5],
    color: "violet",
    sortOrder: 3,
  },
  {
    title: "SaaS App Development",
    note: "Build, ship, iterate — Tue / Thu / Sat / Sun",
    slot: "evening",
    days: [0, 2, 4, 6],
    color: "blue",
    sortOrder: 4,
  },
];

/** Accent palette available in the setup screen. */
export const TASK_COLORS = [
  "lime",
  "amber",
  "rose",
  "teal",
  "violet",
  "blue",
  "orange",
  "cyan",
] as const;

export type TaskColor = (typeof TASK_COLORS)[number];
