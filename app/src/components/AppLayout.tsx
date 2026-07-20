import { NavLink, Outlet } from "react-router";
import { UserButton } from "@clerk/clerk-react";
import { CalendarCheck2, ChartColumnBig, Flame, SlidersHorizontal } from "lucide-react";
import { endOfMonth, getDaysInMonth } from "@/lib/dates";
import { useAutoSeed } from "@/hooks/use-tracker";
import { AppearanceSettings } from "@/components/AppearanceSettings";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Today", icon: CalendarCheck2, end: true },
  { to: "/setup", label: "Routine", icon: SlidersHorizontal, end: false },
  { to: "/reports", label: "Reports", icon: ChartColumnBig, end: false },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary glow-lime">
        <Flame className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
      </div>
      <div className="leading-tight">
        <div className="font-display text-[15px] font-bold tracking-tight">GRIND</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
          Tracker
        </div>
      </div>
    </div>
  );
}

export default function AppLayout() {
  // First-run: load the user's weekly routine into the database.
  useAutoSeed();

  const now = new Date();
  const daysInMonth = getDaysInMonth(now);
  const daysLeft = endOfMonth(now).getDate() - now.getDate();

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/40 backdrop-blur md:flex">
        <div className="flex items-center justify-between px-5 pb-6 pt-6">
          <Logo />
          <div className="flex items-center gap-2">
            <AppearanceSettings />
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )
              }
            >
              <Icon className="h-[18px] w-[18px]" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 pb-6">
          <div className="rounded-xl border border-border bg-secondary/30 p-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Monthly cycle
            </div>
            <div className="mt-1.5 font-display text-2xl font-bold tracking-tight">
              Day {now.getDate()}
              <span className="text-sm font-medium text-muted-foreground"> / {daysInMonth}</span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {daysLeft === 0 ? "Resets tomorrow" : `Resets in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/85 px-4 py-3 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          <div className="mr-1 text-right text-[11px] leading-tight text-muted-foreground">
            <div className="font-display text-sm font-bold text-foreground">
              Day {now.getDate()}/{daysInMonth}
            </div>
            <div>monthly cycle</div>
          </div>
          <AppearanceSettings />
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Content */}
      <main className="pb-24 md:pb-10 md:pl-60">
        <div className="mx-auto w-full max-w-5xl px-4 pt-6 md:px-8 md:pt-10">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex items-stretch justify-around border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold uppercase tracking-wider transition-colors",
                isActive ? "text-primary" : "text-muted-foreground",
              )
            }
          >
            <Icon className="h-5 w-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
