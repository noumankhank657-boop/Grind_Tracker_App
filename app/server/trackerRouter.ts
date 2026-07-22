import { z } from "zod";
import { createRouter, protectedProcedure } from "./middleware.js";
import {
  completionsInRange,
  createTask,
  deleteTask,
  listTasks,
  logProgress,
  seedDefaultsIfEmpty,
  toggleCompletion,
  updateTask,
} from "./queries/tracker.js";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

const daysOfWeek = z
  .array(z.number().int().min(0).max(6))
  .min(1, "Pick at least one day");

const slotEnum = z.enum(["anytime", "morning", "afternoon", "evening"]);
const goalTypeEnum = z.enum(["checkbox", "numeric"]);

const goalTargetField = z
  .number()
  .int()
  .min(1, "Target must be at least 1")
  .max(100000, "Target is too large")
  .nullable()
  .optional();

const goalUnitField = z.string().trim().max(24).nullable().optional();

const deadlineField = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM (24h)")
  .nullable()
  .optional();

const durationField = z
  .number()
  .int()
  .min(5, "Minimum 5 minutes")
  .max(1440, "Maximum 24 hours")
  .nullable()
  .optional();

export const trackerRouter = createRouter({
  listTasks: protectedProcedure.query(({ ctx }) => listTasks(ctx.userId)),

  createTask: protectedProcedure
    .input(
      z.object({
        title: z.string().trim().min(1, "Title is required").max(120),
        note: z.string().trim().max(255).optional(),
        slot: slotEnum,
        deadline: deadlineField,
        durationMin: durationField,
        goalType: goalTypeEnum.default("checkbox"),
        goalTarget: goalTargetField,
        goalUnit: goalUnitField,
        days: daysOfWeek,
        color: z.string().max(24),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      createTask(ctx.userId, {
        title: input.title,
        note: input.note ?? null,
        slot: input.slot,
        deadline: input.deadline ?? null,
        durationMin: input.durationMin ?? null,
        goalType: input.goalType,
        goalTarget: input.goalType === "numeric" ? input.goalTarget ?? 1 : null,
        goalUnit: input.goalType === "numeric" ? input.goalUnit ?? null : null,
        days: [...input.days].sort(),
        color: input.color,
        sortOrder: input.sortOrder ?? 99,
      }),
    ),

  updateTask: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string().trim().min(1).max(120).optional(),
        note: z.string().trim().max(255).nullable().optional(),
        slot: slotEnum.optional(),
        deadline: deadlineField,
        durationMin: durationField,
        goalType: goalTypeEnum.optional(),
        goalTarget: goalTargetField,
        goalUnit: goalUnitField,
        days: daysOfWeek.optional(),
        color: z.string().max(24).optional(),
        sortOrder: z.number().int().optional(),
      }),
    )
    .mutation(({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.days) data.days = [...data.days].sort();
      if (data.goalType === "checkbox") {
        data.goalTarget = null;
        data.goalUnit = null;
      }
      return updateTask(ctx.userId, id, data);
    }),

  deleteTask: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ ctx, input }) => deleteTask(ctx.userId, input.id)),

  seedDefaults: protectedProcedure.mutation(({ ctx }) => seedDefaultsIfEmpty(ctx.userId)),

  toggleCompletion: protectedProcedure
    .input(z.object({ taskId: z.number(), date: dateString }))
    .mutation(({ ctx, input }) => toggleCompletion(ctx.userId, input.taskId, input.date)),

  logProgress: protectedProcedure
    .input(
      z.object({
        taskId: z.number(),
        date: dateString,
        value: z.number().int().min(0).max(100000),
      }),
    )
    .mutation(({ ctx, input }) =>
      logProgress(ctx.userId, input.taskId, input.date, input.value),
    ),

  completionsInRange: protectedProcedure
    .input(z.object({ start: dateString, end: dateString }))
    .query(({ ctx, input }) => completionsInRange(ctx.userId, input.start, input.end)),
});
