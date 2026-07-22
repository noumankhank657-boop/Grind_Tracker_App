import { and, asc, between, eq } from "drizzle-orm";
import { getDb } from "./connection.js";
import { completions, tasks, type InsertTask } from "../../db/schema.js";
import { DEFAULT_ROUTINE } from "../../contracts/routine.js";

export async function listTasks(userId: string) {
  return getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.active, true), eq(tasks.userId, userId)))
    .orderBy(asc(tasks.sortOrder), asc(tasks.id));
}

export async function createTask(
  userId: string,
  data: Omit<InsertTask, "id" | "createdAt" | "userId">,
) {
  const [{ id }] = await getDb()
    .insert(tasks)
    .values({ ...data, userId })
    .$returningId();
  const [row] = await getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return row;
}

export async function updateTask(
  userId: string,
  id: number,
  data: Partial<Omit<InsertTask, "id" | "createdAt" | "userId">>,
) {
  await getDb()
    .update(tasks)
    .set(data)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  const [row] = await getDb()
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  return row;
}

export async function deleteTask(userId: string, id: number) {
  const db = getDb();
  // Ownership check first so one user can never delete another user's rows.
  const [owned] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
  if (!owned) return;
  await db
    .delete(completions)
    .where(and(eq(completions.taskId, id), eq(completions.userId, userId)));
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, userId)));
}

/** Seeds the default weekly routine only when this user has no tasks yet. */
export async function seedDefaultsIfEmpty(userId: string) {
  const existing = await getDb()
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.userId, userId))
    .limit(1);
  if (existing.length > 0) return { seeded: false };
  await getDb().insert(tasks).values(
    DEFAULT_ROUTINE.map((t) => ({
      userId,
      title: t.title,
      note: t.note,
      slot: t.slot,
      days: t.days,
      color: t.color,
      sortOrder: t.sortOrder,
    })),
  );
  return { seeded: true };
}

/** Toggles a completion; returns the new completed state. */
export async function toggleCompletion(userId: string, taskId: number, date: string) {
  const db = getDb();

  // Ownership check — can't toggle completions on a task you don't own.
  const [owned] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  if (!owned) throw new Error("Task not found");

  const [existing] = await db
    .select()
    .from(completions)
    .where(
      and(
        eq(completions.taskId, taskId),
        eq(completions.date, date),
        eq(completions.userId, userId),
      ),
    )
    .limit(1);

  if (existing) {
    await db.delete(completions).where(eq(completions.id, existing.id));
    return { completed: false };
  }
  await db.insert(completions).values({ taskId, date, userId });
  return { completed: true };
}

/**
 * Sets the logged amount for a numeric-goal task on a given date.
 * A value <= 0 clears the entry entirely (back to not-started).
 * Returns the resulting value (null if cleared).
 */
export async function logProgress(
  userId: string,
  taskId: number,
  date: string,
  value: number,
) {
  const db = getDb();

  // Ownership check — same pattern as toggleCompletion.
  const [owned] = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
  if (!owned) throw new Error("Task not found");

  const [existing] = await db
    .select()
    .from(completions)
    .where(
      and(
        eq(completions.taskId, taskId),
        eq(completions.date, date),
        eq(completions.userId, userId),
      ),
    )
    .limit(1);

  if (value <= 0) {
    if (existing) {
      await db.delete(completions).where(eq(completions.id, existing.id));
    }
    return { value: null };
  }

  if (existing) {
    await db.update(completions).set({ value }).where(eq(completions.id, existing.id));
  } else {
    await db.insert(completions).values({ taskId, date, userId, value });
  }
  return { value };
}

export async function completionsInRange(userId: string, start: string, end: string) {
  return getDb()
    .select()
    .from(completions)
    .where(and(between(completions.date, start, end), eq(completions.userId, userId)))
    .orderBy(asc(completions.date));
}
