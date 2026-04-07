import { motion } from "framer-motion";
import { CheckCircle2, Circle, Flame, Zap } from "lucide-react";

interface MissionCardProps {
  title: string;
  description: string;
  reward: number;
  completed: boolean;
  progress?: number;
  onClick?: () => void;
}

export function MissionCard({ title, description, reward, completed, progress = 0, onClick }: MissionCardProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-full p-4 rounded-2xl text-left transition-all ${
        completed 
          ? "bg-success/10 border-2 border-success" 
          : "aza-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          completed ? "bg-success" : "bg-muted"
        }`}>
          {completed ? (
            <CheckCircle2 className="w-5 h-5 text-success-foreground" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={`font-bold ${completed ? "text-success" : "text-foreground"}`}>
              {title}
            </h4>
            {!completed && progress > 0 && (
              <span className="aza-badge-gold text-xs">
                <Flame className="w-3 h-3" />
                {progress}%
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground mb-2">{description}</p>
          
          {!completed && progress > 0 && (
            <div className="aza-progress mb-2">
              <motion.div
                className="h-full rounded-full bg-gradient-success"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          )}

          <div className="flex items-center gap-1 text-primary font-bold text-sm">
            <Zap className="w-4 h-4" />
            <span>+{reward} XP</span>
          </div>
        </div>
      </div>
    </motion.button>
  );
}
