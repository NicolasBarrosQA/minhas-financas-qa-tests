import { motion, TargetAndTransition, Transition } from "framer-motion";

// Import all mascot states
import pigDefault from "@/assets/mascot/pig-default.png";
import pigAngry from "@/assets/mascot/pig-angry.png";
import pigCelebrating from "@/assets/mascot/pig-celebrating.png";
import pigConfused from "@/assets/mascot/pig-confused.png";
import pigRich from "@/assets/mascot/pig-rich.png";
import pigSwole from "@/assets/mascot/pig-swole.png";
import pigSad from "@/assets/mascot/pig-sad.png";

export type MascotMood = 
  | "happy" 
  | "celebrating" 
  | "sad" 
  | "confused" 
  | "angry" 
  | "confident" 
  | "rich";

interface MascotProps {
  mood?: MascotMood;
  size?: "sm" | "md" | "lg" | "xl";
  message?: string;
  className?: string;
  showBubble?: boolean;
  animated?: boolean;
}

const sizeClasses = {
  sm: "w-16 h-16",
  md: "w-24 h-24",
  lg: "w-32 h-32",
  xl: "w-48 h-48",
};

const moodImages: Record<MascotMood, string> = {
  happy: pigDefault,
  celebrating: pigCelebrating,
  sad: pigSad,
  confused: pigConfused,
  angry: pigAngry,
  confident: pigSwole,
  rich: pigRich,
};

const moodAnimations: Record<MascotMood, { animate: TargetAndTransition; transition: Transition }> = {
  happy: {
    animate: { y: [0, -5, 0] },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  celebrating: {
    animate: { y: [0, -15, 0], rotate: [0, 10, -10, 0] },
    transition: { duration: 0.6, repeat: 3 },
  },
  sad: {
    animate: { y: [0, 2, 0] },
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
  confused: {
    animate: { rotate: [-5, 5, -5] },
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  angry: {
    animate: { x: [0, -3, 3, 0] },
    transition: { duration: 0.3, repeat: Infinity },
  },
  confident: {
    animate: { scale: [1, 1.05, 1] },
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
  rich: {
    animate: { rotate: [0, 5, -5, 0], y: [0, -3, 0] },
    transition: { duration: 2, repeat: Infinity },
  },
};

export function Mascot({ 
  mood = "happy", 
  size = "md", 
  message, 
  className = "",
  showBubble = true,
  animated = true,
}: MascotProps) {
  const animation = moodAnimations[mood];
  const imageSrc = moodImages[mood];

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      {message && showBubble && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="relative bg-card rounded-2xl px-4 py-3 shadow-aza max-w-[200px] text-center"
        >
          <p className="text-sm font-semibold text-foreground">{message}</p>
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-card rotate-45 shadow-aza" />
        </motion.div>
      )}
      {animated ? (
        <motion.div
          className={`${sizeClasses[size]} relative`}
          animate={animation.animate}
          transition={animation.transition}
        >
          <img
            src={imageSrc}
            alt={`Azinha - ${mood}`}
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </motion.div>
      ) : (
        <div className={`${sizeClasses[size]} relative`}>
          <img
            src={imageSrc}
            alt={`Azinha - ${mood}`}
            className="w-full h-full object-contain drop-shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
