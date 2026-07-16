import { and, asc, between, eq } from "drizzle-orm";
import { getDb } from "./connection";
import { completions, tasks, type InsertTask } from "@db/schema";
import { DEFAULT_ROUTINE } from "@contracts/routine";

export async function listTasks() {
  return getDb()
    .select()
    .from(tasks)
    .where(eq(tasks.active, true))
    .orderBy(asc(tasks.sortOrder), asc(tasks.id));
}

export async function createTask(data: Omit<InsertTask, "id" | "createdAt">) {
  const [{ id }] = await getDb().insert(tasks).values(data).$returningId();
  const [row] = await getDb().select().from(tasks).where(eq(tasks.id, id));
  return row;
}

export async function updateTask(
  id: number,
  data: Partial<Omit<InsertTask, "id" | "createdAt">>,
) {
  await getDb().update(tasks).set(data).where(eq(tasks.id, id));
  const [row] = await getDb().select().from(tasks).where(eq(tasks.id, id));
  return row;
}

export async function deleteTask(id: number) {
  const db = getDb();
  await db.delete(completions).where(eq(completions.taskId, id));
  await db.delete(tasks).where(eq(tasks.id, id));
}

/** Seeds the default weekly routine only when no tasks exist. */
export async function seedDefaultsIfEmpty() {
  const existing = await getDb().select({ id: tasks.id }).from(tasks).limit(1);
  if (existing.length > 0) return { seeded: false };
  await getDb().insert(tasks).values(
    DEFAULT_ROUTINE.map((t) => ({
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
export async function toggleCompletion(taskId: number, date: string) {
  const db = getDb();
  const [existing] = await db
    .select()
    .from(completions)
    .where(and(eq(completions.taskId, taskId), eq(completions.date, date)))
    .limit(1);

  if (existing) {
    await db.delete(completions).where(eq(completions.id, existing.id));
    return { completed: false };
  }
  await db.insert(completions).values({ taskId, date });
  return { completed: true };
}

export async function completionsInRange(start: string, end: string) {
  return getDb()
    .select()
    .from(completions)
    .where(between(completions.date, start, end))
    .orderBy(asc(completions.date));
}
