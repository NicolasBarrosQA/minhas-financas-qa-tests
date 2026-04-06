import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface StreakBadgeProps {
  days: number;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: "w-12 h-12 text-sm",
  md: "w-16 h-16 text-lg",
  lg: "w-24 h-24 text-2xl",
};

export function StreakBadge({ days, size = "md" }: StreakBadgeProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={`${sizeClasses[size]} rounded-full bg-gradient-gold shadow-gold flex flex-col items-center justify-center relative`}
    >
      <Flame className={`${size === "sm" ? "w-4 h-4" : size === "md" ? "w-6 h-6" : "w-8 h-8"} text-primary-foreground streak-fire`} />
      <span className="font-black text-primary-foreground">{days}</span>
      
      {/* Glow effect */}
      <motion.div
        className="absolute inset-0 rounded-full bg-primary/30"
        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </motion.div>
  );
}
