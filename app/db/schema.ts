import {
  mysqlTable,
  mysqlEnum,
  serial,
  varchar,
  bigint,
  int,
  boolean,
  json,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/mysql-core";

/**
 * A task in the weekly routine template.
 * `days` holds the weekdays the task is scheduled on, using JS convention:
 * 0 = Sunday, 1 = Monday, ... 6 = Saturday.
 */
export const tasks = mysqlTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    /** Clerk user id (the "sub" claim). Every row belongs to exactly one user. */
    userId: varchar("userId", { length: 191 }).notNull(),
    title: varchar("title", { length: 120 }).notNull(),
    note: varchar("note", { length: 255 }),
    slot: mysqlEnum("slot", ["anytime", "morning", "afternoon", "evening"])
      .notNull()
      .default("anytime"),
    /** Latest local time of day to finish the task by, "HH:MM" 24h. Null = no deadline. */
    deadline: varchar("deadline", { length: 5 }),
    /** Estimated effort in minutes. Null = no estimate. */
    durationMin: int("durationMin"),
    /** "checkbox" = done/not-done. "numeric" = tracked against goalTarget. */
    goalType: mysqlEnum("goalType", ["checkbox", "numeric"]).notNull().default("checkbox"),
    /** Target amount for numeric goals (e.g. 8 for "8 glasses"). Null for checkbox tasks. */
    goalTarget: int("goalTarget"),
    /** Unit label for numeric goals (e.g. "glasses", "pages", "min"). Null for checkbox tasks. */
    goalUnit: varchar("goalUnit", { length: 24 }),
    days: json("days").$type<number[]>().notNull(),
    color: varchar("color", { length: 24 }).notNull().default("lime"),
    sortOrder: int("sortOrder").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("createdAt").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("tasks_user_idx").on(t.userId),
  }),
);

/**
 * One row per completed task per local calendar date (YYYY-MM-DD).
 * The unique index makes toggling idempotent.
 */
export const completions = mysqlTable(
  "completions",
  {
    id: serial("id").primaryKey(),
    userId: varchar("userId", { length: 191 }).notNull(),
    taskId: bigint("taskId", { mode: "number", unsigned: true }).notNull(),
    date: varchar("date", { length: 10 }).notNull(),
    /** Logged amount for numeric-goal tasks (e.g. 5 of 8 glasses). Null for checkbox tasks. */
    value: int("value"),
    completedAt: timestamp("completedAt").notNull().defaultNow(),
  },
  (t) => ({
    taskDateUnique: uniqueIndex("task_date_unique").on(t.taskId, t.date),
    dateIdx: index("date_idx").on(t.date),
    userDateIdx: index("completions_user_date_idx").on(t.userId, t.date),
  }),
);

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
export type Completion = typeof completions.$inferSelect;
export type InsertCompletion = typeof completions.$inferInsert;
