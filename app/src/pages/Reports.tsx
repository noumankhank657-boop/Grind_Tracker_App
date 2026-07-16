import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronLeft, ChevronRight, Flame, Target, TrendingUp, Trophy } from "lucide-react";
import { useCompletions, useTasks } from "@/hooks/use-tracker";
import { useAccent } from "@/providers/accent";
import { alpha, hexOf } from "@/lib/colors";
import {
  addMonths,
  addYears,
  endOfMonth,
  endOfYear,
  format,
  getDay,
  isSameMonth,
  startOfMonth,
  startOfYear,
  toKey,
} from "@/lib/dates";
import { buildCompletionMap, monthStats, yearStats, type DayStat } from "@/lib/stats";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

/* ---------- shared bits ---------- */

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ backgroundColor: alpha(accent, 0.12), color: accent }}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 font-display text-3xl font-bold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function ChartTooltip({ active, payload, label, suffix }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl">
      <div className="font-bold text-foreground">{label}</div>
      <div className="text-muted-foreground">
        {payload[0].value}
        {suffix}
      </div>
    </div>
  );
}

function PerTaskBars({
  stats,
}: {
  stats: { task: { id: number; title: string; color: string }; done: number; scheduled: number; pct: number }[];
}) {
  return (
    <div className="space-y-4">
      {stats.map(({ task, done, scheduled, pct }) => (
        <div key={task.id}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate text-sm font-semibold">{task.title}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              <span className="font-bold text-foreground">{done}</span> / {scheduled} ·{" "}
              {Math.round(pct * 100)}%
            </span>
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary/50">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: hexOf(task.color) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- monthly view ---------- */

function MonthHeatmap({
  month,
  days,
  accentHex,
  accentFg,
}: {
  month: Date;
  days: { date: Date; stat: DayStat }[];
  accentHex: string;
  accentFg: string;
}) {
  const todayKeyStr = toKey(new Date());
  const first = startOfMonth(month);
  const offset = (getDay(first) + 6) % 7; // Monday-first
  const total = endOfMonth(month).getDate();
  const statByDay = new Map(days.map((d) => [d.date.getDate(), d.stat]));

  const cells: ({ day: number; stat?: DayStat } | null)[] = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= total; d++) cells.push({ day: d, stat: statByDay.get(d) });

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div
            key={i}
            className="pb-1 text-center text-[10px] font-bold uppercase text-muted-foreground"
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={i} />;
          const key = toKey(new Date(month.getFullYear(), month.getMonth(), cell.day));
          const isToday = key === todayKeyStr;
          const future = !cell.stat; // not elapsed yet
          const pct = cell.stat?.pct ?? 0;
          const perfect = cell.stat?.perfect ?? false;
          return (
            <div
              key={i}
              title={`${format(new Date(month.getFullYear(), month.getMonth(), cell.day), "MMM d")} — ${
                future ? "upcoming" : `${cell.stat!.done}/${cell.stat!.total} done`
              }`}
              className={cn(
                "flex aspect-square items-center justify-center rounded-md text-xs font-semibold transition-transform hover:scale-110",
                isToday && "ring-2 ring-primary",
                future && "text-muted-foreground/30",
                perfect && "font-bold",
              )}
              style={{
                backgroundColor: future
                  ? "rgba(128,128,128,0.06)"
                  : perfect
                    ? accentHex
                    : alpha(accentHex, pct === 0 ? 0.05 : 0.1 + pct * 0.5),
                color: perfect ? accentFg : undefined,
              }}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: alpha(accentHex, 0.1) }} />
          Missed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: alpha(accentHex, 0.4) }} />
          Partial
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: accentHex }} />
          Perfect
        </span>
      </div>
    </div>
  );
}

function MonthlyReport() {
  const { accent } = useAccent();
  const now = new Date();
  const [month, setMonth] = useState(() => startOfMonth(now));
  const isCurrent = isSameMonth(month, now);

  const start = toKey(startOfMonth(month));
  const end = toKey(endOfMonth(month));
  const tasksQuery = useTasks();
  const completionsQuery = useCompletions(start, end);

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const byDate = useMemo(
    () => buildCompletionMap(completionsQuery.data ?? []),
    [completionsQuery.data],
  );

  const stats = monthStats(tasks, byDate, month, now);
  const chartData = stats.days.map((d) => ({
    day: d.date.getDate(),
    pct: Math.round(d.stat.pct * 100),
    perfect: d.stat.perfect,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight">
          {format(month, "MMMM yyyy")}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setMonth((m) => addMonths(m, -1))}
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={isCurrent}
            onClick={() => setMonth((m) => addMonths(m, 1))}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Completion"
          value={`${Math.round(stats.pct * 100)}%`}
          sub={`${stats.totalDone} of ${stats.totalScheduled} tasks`}
          icon={Target}
          accent={accent.hex}
        />
        <StatCard
          label="Perfect days"
          value={`${stats.perfectDays}`}
          sub="all scheduled tasks done"
          icon={Trophy}
          accent="#fbbf24"
        />
        <StatCard
          label="Best streak"
          value={`${stats.bestStreak}`}
          sub="consecutive perfect days"
          icon={Flame}
          accent="#fb923c"
        />
        <StatCard
          label="Check-offs"
          value={`${stats.totalDone}`}
          sub="total completions logged"
          icon={TrendingUp}
          accent="#60a5fa"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Consistency map
          </h3>
          <MonthHeatmap
            month={month}
            days={stats.days}
            accentHex={accent.hex}
            accentFg={accent.fgHex}
          />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Habit breakdown
          </h3>
          {stats.perTask.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks in your routine yet.</p>
          ) : (
            <PerTaskBars stats={stats.perTask} />
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Daily completion rate
        </h3>
        {chartData.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Nothing to show yet — this month hasn't started.
          </p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={{ stroke: "#27272a" }}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fill: "#71717a", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}%`}
                />
                <Tooltip content={<ChartTooltip suffix="% complete" />} cursor={{ fill: "rgba(128,128,128,0.08)" }} />
                <Bar dataKey="pct" radius={[4, 4, 0, 0]} maxBarSize={22}>
                  {chartData.map((d, i) => (
                    <Cell key={i} fill={d.perfect ? accent.hex : "#3f3f46"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- yearly view ---------- */

function YearlyReport() {
  const { accent } = useAccent();
  const now = new Date();
  const [year, setYear] = useState(() => startOfYear(now));
  const isCurrent = year.getFullYear() === now.getFullYear();

  const start = toKey(startOfYear(year));
  const end = toKey(endOfYear(year));
  const tasksQuery = useTasks();
  const completionsQuery = useCompletions(start, end);

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const byDate = useMemo(
    () => buildCompletionMap(completionsQuery.data ?? []),
    [completionsQuery.data],
  );

  const stats = yearStats(tasks, byDate, year, now);
  const chartData = stats.months.map((m) => ({
    label: m.label,
    pct: Math.round(m.pct * 100),
    current: isSameMonth(m.month, now),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl font-bold tracking-tight">{format(year, "yyyy")}</h2>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setYear((y) => addYears(y, -1))}
            aria-label="Previous year"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            disabled={isCurrent}
            onClick={() => setYear((y) => addYears(y, 1))}
            aria-label="Next year"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Completion"
          value={`${Math.round(stats.pct * 100)}%`}
          sub={`${stats.totalDone} of ${stats.totalScheduled} tasks`}
          icon={Target}
          accent={accent.hex}
        />
        <StatCard
          label="Perfect days"
          value={`${stats.perfectDays}`}
          sub="across the year"
          icon={Trophy}
          accent="#fbbf24"
        />
        <StatCard
          label="Best month"
          value={stats.bestMonth ? stats.bestMonth.label : "—"}
          sub={stats.bestMonth ? `${Math.round(stats.bestMonth.pct * 100)}% completion` : "no data yet"}
          icon={TrendingUp}
          accent="#a78bfa"
        />
        <StatCard
          label="Check-offs"
          value={`${stats.totalDone}`}
          sub="total completions logged"
          icon={Flame}
          accent="#fb923c"
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Month by month
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
              <XAxis
                dataKey="label"
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={{ stroke: "#27272a" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: "#71717a", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <Tooltip content={<ChartTooltip suffix="% complete" />} cursor={{ fill: "rgba(128,128,128,0.08)" }} />
              <Bar dataKey="pct" radius={[5, 5, 0, 0]} maxBarSize={40}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.current ? accent.hex : alpha(accent.hex, 0.45)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
          Habit breakdown — full year
        </h3>
        {stats.perTask.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tasks in your routine yet.</p>
        ) : (
          <PerTaskBars stats={stats.perTask} />
        )}
      </div>
    </div>
  );
}

/* ---------- page ---------- */

export default function Reports() {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Progress</div>
      <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">Reports</h1>
      <p className="mt-2 max-w-xl text-sm text-muted-foreground">
        Every check-off is stored — here's the honest picture of the grind, by month and by year.
      </p>

      <Tabs defaultValue="monthly" className="mt-8">
        <TabsList>
          <TabsTrigger value="monthly" className="px-5">
            Monthly
          </TabsTrigger>
          <TabsTrigger value="yearly" className="px-5">
            Yearly
          </TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-6">
          <MonthlyReport />
        </TabsContent>
        <TabsContent value="yearly" className="mt-6">
          <YearlyReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
