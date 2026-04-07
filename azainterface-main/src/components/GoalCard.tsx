import { motion } from "framer-motion";
import { ProgressRing } from "./ProgressRing";
import { Target, Flame, Star } from "lucide-react";

interface GoalCardProps {
  title: string;
  current: number;
  target: number;
  icon?: React.ReactNode;
  deadline?: string;
  streak?: number;
  onClick?: () => void;
}

export function GoalCard({ title, current, target, icon, deadline, streak, onClick }: GoalCardProps) {
  const progress = Math.min((current / target) * 100, 100);
  const status = progress >= 100 ? "success" : progress >= 70 ? "warning" : "default";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="aza-card p-4 w-full text-left"
    >
      <div className="flex items-center gap-4">
        <ProgressRing progress={progress} size={80} strokeWidth={8} status={status}>
          <div className="flex flex-col items-center">
            {icon || <Target className="w-5 h-5 text-primary" />}
            <span className="text-xs font-bold text-foreground">{Math.round(progress)}%</span>
          </div>
        </ProgressRing>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-foreground">{title}</h3>
            {streak && streak > 0 && (
              <div className="flex items-center gap-1 aza-badge-gold">
                <Flame className="w-3 h-3" />
                <span className="text-xs">{streak}</span>
              </div>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mb-2">
            {formatCurrency(current)} de {formatCurrency(target)}
          </p>

          <div className="aza-progress">
            <motion.div
              className={`aza-progress-bar ${
                status === "success" ? "aza-progress-bar-success" : 
                status === "warning" ? "aza-progress-bar-warning" : ""
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>

          {deadline && (
            <p className="text-xs text-muted-foreground mt-2">
              Meta: {new Date(deadline).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>

        {progress >= 100 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center shadow-gold"
          >
            <Star className="w-5 h-5 text-primary-foreground fill-current" />
          </motion.div>
        )}
      </div>
    </motion.button>
  );
}
