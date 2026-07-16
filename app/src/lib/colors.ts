/**
 * Task accent colors as raw hex values — used with inline styles so Tailwind's
 * class purging can never strip them.
 */
export const COLOR_HEX: Record<string, string> = {
  lime: "#a3e635",
  amber: "#fbbf24",
  rose: "#fb7185",
  teal: "#2dd4bf",
  violet: "#a78bfa",
  blue: "#60a5fa",
  orange: "#fb923c",
  cyan: "#22d3ee",
};

export const hexOf = (color: string): string => COLOR_HEX[color] ?? COLOR_HEX.lime;

/** Raw hex "#rrggbb" at a given alpha (0–1), as rgba() string. */
export function alpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Named task color at a given alpha. */
export function hexAlpha(color: string, a: number): string {
  return alpha(hexOf(color), a);
}

/**
 * Selectable app accent themes. `hsl` holds raw HSL channels (no hsl()
 * wrapper) because Tailwind consumes them via hsl(var(--primary)).
 */
export interface Accent {
  name: string;
  label: string;
  hex: string;
  /** HSL channels for --primary / --ring */
  hsl: string;
  /** HSL channels for --primary-foreground */
  fgHsl: string;
  /** Hex used for text/icons sitting on top of the accent color */
  fgHex: string;
}

export const ACCENTS: Accent[] = [
  { name: "lime", label: "Lime", hex: "#a3e635", hsl: "80 81% 55%", fgHsl: "80 80% 8%", fgHex: "#1a2e05" },
  { name: "emerald", label: "Emerald", hex: "#34d399", hsl: "158 64% 52%", fgHsl: "160 80% 8%", fgHex: "#022c22" },
  { name: "amber", label: "Amber", hex: "#fbbf24", hsl: "43 96% 56%", fgHsl: "45 90% 10%", fgHex: "#451a03" },
  { name: "rose", label: "Rose", hex: "#fb7185", hsl: "351 95% 71%", fgHsl: "350 80% 12%", fgHex: "#4c0519" },
  { name: "violet", label: "Violet", hex: "#a78bfa", hsl: "258 90% 76%", fgHsl: "260 60% 12%", fgHex: "#2e1065" },
  { name: "blue", label: "Blue", hex: "#60a5fa", hsl: "213 94% 68%", fgHsl: "215 80% 12%", fgHex: "#172554" },
];

export const DEFAULT_ACCENT = ACCENTS[0];

export function accentByName(name: string | null | undefined): Accent {
  return ACCENTS.find((a) => a.name === name) ?? DEFAULT_ACCENT;
}
