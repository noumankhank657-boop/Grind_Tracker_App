import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { accentByName, type Accent } from "@/lib/colors";

const STORAGE_KEY = "grind-accent";

interface AccentContextValue {
  accent: Accent;
  setAccent: (name: string) => void;
}

const AccentContext = createContext<AccentContextValue>({
  accent: accentByName(null),
  setAccent: () => {},
});

function applyAccent(accent: Accent) {
  const root = document.documentElement;
  root.style.setProperty("--primary", accent.hsl);
  root.style.setProperty("--primary-foreground", accent.fgHsl);
  root.style.setProperty("--ring", accent.hsl);
}

export function AccentProvider({ children }: { children: ReactNode }) {
  const [accent, setAccentState] = useState<Accent>(() => {
    try {
      return accentByName(localStorage.getItem(STORAGE_KEY));
    } catch {
      return accentByName(null);
    }
  });

  useEffect(() => {
    applyAccent(accent);
  }, [accent]);

  const setAccent = (name: string) => {
    const next = accentByName(name);
    try {
      localStorage.setItem(STORAGE_KEY, next.name);
    } catch {
      /* private mode — ignore */
    }
    setAccentState(next);
  };

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>{children}</AccentContext.Provider>
  );
}

/** Current app accent: name + hex for inline styles. */
export function useAccent() {
  return useContext(AccentContext);
}
