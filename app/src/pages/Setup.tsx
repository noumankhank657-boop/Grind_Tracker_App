import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, Moon, Pencil, Plus, Sun, Sunrise, Timer, Trash2 } from "lucide-react";
import type { Task } from "@db/schema";
import { trpc } from "@/providers/trpc";
import { useInvalidateTracker, useTasks } from "@/hooks/use-tracker";
import { COLOR_HEX, hexAlpha, hexOf } from "@/lib/colors";
import { DAY_SHORT, SLOT_LABELS, TASK_COLORS, type TaskSlot } from "@contracts/routine";
import { formatDeadline, formatDuration, WEEK_ORDER } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormState {
  title: string;
  note: string;
  slot: TaskSlot;
  deadline: string; // "" = no deadline, otherwise "HH:MM"
  durationMin: number | null;
  days: number[];
  color: string;
}

const EMPTY_FORM: FormState = {
  title: "",
  note: "",
  slot: "anytime",
  deadline: "",
  durationMin: null,
  days: [],
  color: "lime",
};

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 180];

const SLOT_ICONS: Partial<Record<TaskSlot, typeof Moon>> = {
  morning: Sunrise,
  afternoon: Sun,
  evening: Moon,
};

function SlotBadge({ task }: { task: Task }) {
  if (task.slot === "anytime") return null;
  const Icon = SLOT_ICONS[task.slot];
  return (
    <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {Icon && <Icon className="h-3 w-3" />}
      {SLOT_LABELS[task.slot]}
    </span>
  );
}

function DayChips({
  days,
  onToggle,
  color,
}: {
  days: number[];
  onToggle: (day: number) => void;
  color: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {WEEK_ORDER.map((day) => {
        const active = days.includes(day);
        return (
          <button
            key={day}
            type="button"
            onClick={() => onToggle(day)}
            className={cn(
              "h-9 w-11 rounded-lg border text-xs font-bold transition-all",
              active
                ? "border-transparent text-zinc-950"
                : "border-border bg-secondary/30 text-muted-foreground hover:border-zinc-500",
            )}
            style={active ? { backgroundColor: hexOf(color) } : undefined}
          >
            {DAY_SHORT[day]}
          </button>
        );
      })}
    </div>
  );
}

function TaskDialog({
  open,
  onOpenChange,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: FormState & { id?: number };
  onSave: (form: FormState & { id?: number }) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  useEffect(() => {
    if (open) {
      setForm({
        title: initial.title,
        note: initial.note,
        slot: initial.slot,
        deadline: initial.deadline,
        durationMin: initial.durationMin,
        days: initial.days,
        color: initial.color,
      });
    }
  }, [open, initial]);

  const valid = form.title.trim().length > 0 && form.days.length > 0;
  const toggleDay = (day: number) =>
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">
            {initial.id ? "Edit task" : "Add a task"}
          </DialogTitle>
          <DialogDescription>
            Pick the days it runs on — the daily checklist picks it up automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Sales Training"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="task-note">
              Note <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="task-note"
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Goal: publish 1 video a day"
              maxLength={255}
            />
          </div>
          <div className="space-y-2">
            <Label>Days</Label>
            <DayChips days={form.days} onToggle={toggleDay} color={form.color} />
            {form.days.length === 0 && (
              <p className="text-xs text-destructive">Pick at least one day.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Time slot</Label>
              <Select
                value={form.slot}
                onValueChange={(v) => setForm((f) => ({ ...f, slot: v as TaskSlot }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(SLOT_LABELS) as TaskSlot[]).map((slot) => (
                    <SelectItem key={slot} value={slot}>
                      {SLOT_LABELS[slot]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2 pt-1.5">
                {TASK_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => setForm((f) => ({ ...f, color: c }))}
                    className={cn(
                      "h-6 w-6 rounded-full transition-transform hover:scale-110",
                      form.color === c &&
                        "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                    )}
                    style={{ backgroundColor: COLOR_HEX[c] }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-deadline">
                Deadline <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="task-deadline"
                type="time"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground">
                The latest you want it done by, each scheduled day.
              </p>
            </div>
            <div className="space-y-2">
              <Label>
                Duration <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select
                value={form.durationMin == null ? "none" : String(form.durationMin)}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, durationMin: v === "none" ? null : Number(v) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No estimate</SelectItem>
                  {DURATION_OPTIONS.map((m) => (
                    <SelectItem key={m} value={String(m)}>
                      {formatDuration(m)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">How long it usually takes.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || saving} onClick={() => onSave({ ...form, id: initial.id })}>
            {saving ? "Saving…" : initial.id ? "Save changes" : "Add task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Setup() {
  const tasksQuery = useTasks();
  const invalidate = useInvalidateTracker();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<(FormState & { id?: number }) | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const createTask = trpc.tracker.createTask.useMutation({ onSuccess: invalidate });
  const updateTask = trpc.tracker.updateTask.useMutation({ onSuccess: invalidate });
  const deleteTask = trpc.tracker.deleteTask.useMutation({ onSuccess: invalidate });

  const tasks = tasksQuery.data ?? [];
  const saving = createTask.isPending || updateTask.isPending;

  const openAdd = () => {
    setEditing({ ...EMPTY_FORM });
    setDialogOpen(true);
  };

  const openEdit = (task: Task) => {
    setEditing({
      id: task.id,
      title: task.title,
      note: task.note ?? "",
      slot: task.slot,
      deadline: task.deadline ?? "",
      durationMin: task.durationMin,
      days: [...task.days],
      color: task.color,
    });
    setDialogOpen(true);
  };

  const handleSave = (form: FormState & { id?: number }) => {
    const payload = {
      title: form.title.trim(),
      note: form.note.trim() || undefined,
      slot: form.slot,
      deadline: form.deadline === "" ? null : form.deadline,
      durationMin: form.durationMin,
      days: form.days,
      color: form.color,
    };
    if (form.id) {
      updateTask.mutate(
        { id: form.id, ...payload, note: payload.note ?? null },
        { onSuccess: () => setDialogOpen(false) },
      );
    } else {
      createTask.mutate(
        { ...payload, sortOrder: tasks.length },
        { onSuccess: () => setDialogOpen(false) },
      );
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Setup
          </div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Weekly Routine
          </h1>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            This is the template your daily checklist is built from. Set a time slot, deadline, and
            duration — the Today screen arranges itself morning → afternoon → evening.
          </p>
        </div>
        <Button onClick={openAdd} className="gap-2 font-bold">
          <Plus className="h-4 w-4" strokeWidth={3} />
          Add task
        </Button>
      </div>

      {/* Weekly overview */}
      <div className="mt-8 rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Week at a glance
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {WEEK_ORDER.map((day) => {
            const dayTasks = tasks.filter((t) => t.days.includes(day));
            return (
              <div key={day} className="min-h-28 rounded-xl bg-secondary/20 p-3">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {DAY_SHORT[day]}
                </div>
                <div className="mt-2 space-y-1.5">
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-semibold leading-tight"
                      style={{
                        backgroundColor: hexAlpha(t.color, 0.12),
                        color: hexOf(t.color),
                      }}
                      title={t.title}
                    >
                      {t.slot === "evening" && <Moon className="h-3 w-3 shrink-0" />}
                      {t.slot === "morning" && <Sunrise className="h-3 w-3 shrink-0" />}
                      {t.slot === "afternoon" && <Sun className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{t.title}</span>
                    </div>
                  ))}
                  {dayTasks.length === 0 && (
                    <div className="pt-1 text-[11px] text-muted-foreground/40">Rest</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Task cards */}
      <div className="mt-8 space-y-3">
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-4 rounded-xl border border-border bg-secondary/20 px-4 py-4"
          >
            <span
              className="h-10 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: hexOf(task.color) }}
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="truncate text-[15px] font-semibold">{task.title}</span>
                <SlotBadge task={task} />
                {task.durationMin != null && (
                  <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Timer className="h-3 w-3" />
                    {formatDuration(task.durationMin)}
                  </span>
                )}
                {task.deadline != null && (
                  <span className="flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    by {formatDeadline(task.deadline)}
                  </span>
                )}
              </div>
              {task.note && (
                <div className="truncate text-xs text-muted-foreground">{task.note}</div>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {WEEK_ORDER.map((day) => {
                  const active = task.days.includes(day);
                  return (
                    <span
                      key={day}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[10px] font-bold",
                        active ? "text-zinc-950" : "bg-secondary/40 text-muted-foreground/40",
                      )}
                      style={active ? { backgroundColor: hexOf(task.color) } : undefined}
                    >
                      {DAY_SHORT[day]}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(task)} aria-label="Edit">
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDeleting(task)}
                aria-label="Delete"
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing ?? EMPTY_FORM}
        onSave={handleSave}
        saving={saving}
      />

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{deleting?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the task from your routine along with its completion history. This
              can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleting && deleteTask.mutate({ id: deleting.id })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
