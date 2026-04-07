import { motion } from "framer-motion";

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  status?: "success" | "warning" | "danger" | "default";
  children?: React.ReactNode;
  showPercentage?: boolean;
}

const statusColors = {
  success: { stroke: "stroke-success", bg: "bg-success/10" },
  warning: { stroke: "stroke-warning", bg: "bg-warning/10" },
  danger: { stroke: "stroke-destructive", bg: "bg-destructive/10" },
  default: { stroke: "stroke-primary", bg: "bg-primary/10" },
};

export function ProgressRing({ 
  progress, 
  size = 120, 
  strokeWidth = 10, 
  status = "default",
  children,
  showPercentage = false
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const colors = statusColors[status];

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={colors.stroke}
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {showPercentage ? (
          <span className="text-sm font-bold text-foreground">{Math.round(progress)}%</span>
        ) : children}
      </div>
    </div>
  );
}
