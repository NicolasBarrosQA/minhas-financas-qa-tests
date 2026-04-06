import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";

interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  bgColor?: string;
  onClick?: () => void;
}

export function QuickAction({ icon: Icon, label, bgColor = "bg-muted", onClick }: QuickActionProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="flex flex-col items-center gap-2"
    >
      <div className={`w-14 h-14 rounded-2xl ${bgColor} flex items-center justify-center shadow-aza`}>
        <Icon className="w-6 h-6 text-foreground" />
      </div>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
    </motion.button>
  );
}
