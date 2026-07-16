import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface ProgressRingProps {
  size?: number;
  stroke?: number;
  progress: number; // 0–1
  color: string;
  children?: ReactNode;
}

export function ProgressRing({
  size = 120,
  stroke = 10,
  progress,
  color,
  children,
}: ProgressRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeOpacity={0.09}
          className="text-foreground"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference * (1 - clamped) }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          style={clamped >= 1 ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}
