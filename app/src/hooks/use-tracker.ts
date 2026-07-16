import { useEffect, useRef } from "react";
import { trpc } from "@/providers/trpc";

export function useTasks() {
  return trpc.tracker.listTasks.useQuery();
}

export function useCompletions(start: string, end: string) {
  return trpc.tracker.completionsInRange.useQuery({ start, end });
}

/**
 * Seeds the user's default weekly routine the very first time the app finds
 * an empty task list. Runs once per session.
 */
export function useAutoSeed() {
  const utils = trpc.useUtils();
  const tasks = trpc.tracker.listTasks.useQuery();
  const attempted = useRef(false);
  const seed = trpc.tracker.seedDefaults.useMutation({
    onSuccess: () => utils.tracker.listTasks.invalidate(),
  });

  useEffect(() => {
    if (attempted.current) return;
    if (tasks.isSuccess && tasks.data.length === 0) {
      attempted.current = true;
      seed.mutate();
    }
  }, [tasks.isSuccess, tasks.data, seed]);

  return tasks;
}

/** Toggle a completion with an optimistic cache update for instant feedback. */
export function useToggleCompletion(rangeStart: string, rangeEnd: string) {
  const utils = trpc.useUtils();
  const key = { start: rangeStart, end: rangeEnd };

  return trpc.tracker.toggleCompletion.useMutation({
    onMutate: async ({ taskId, date }) => {
      await utils.tracker.completionsInRange.cancel();
      const prev = utils.tracker.completionsInRange.getData(key);
      utils.tracker.completionsInRange.setData(key, (old) => {
        if (!old) return old;
        const exists = old.some((r) => r.taskId === taskId && r.date === date);
        if (exists) {
          return old.filter((r) => !(r.taskId === taskId && r.date === date));
        }
        return [
          ...old,
          { id: -Date.now(), taskId, date, completedAt: new Date() },
        ];
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.tracker.completionsInRange.setData(key, ctx.prev);
    },
    onSettled: () => {
      utils.tracker.completionsInRange.invalidate();
    },
  });
}

/** Invalidate everything tracker-related (used after routine edits). */
export function useInvalidateTracker() {
  const utils = trpc.useUtils();
  return () => {
    utils.tracker.listTasks.invalidate();
    utils.tracker.completionsInRange.invalidate();
  };
}
