import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Zap, Target, Wallet, CreditCard, Lightbulb, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useScore, getScoreLevel } from "@/hooks/useGamification";

const BREAKDOWN_ITEMS = [
  { label: "Transações", key: "transactions", max: 200, icon: "📝", color: "#3B82F6" },
  { label: "Sequência", key: "streak", max: 150, icon: "🔥", color: "#F59E0B" },
  { label: "Metas", key: "goals", max: 250, icon: "🎯", color: "#10B981" },
  { label: "Orçamentos", key: "budget", max: 200, icon: "📊", color: "#8B5CF6" },
  { label: "Engajamento", key: "engagement", max: 200, icon: "⚡", color: "#EC4899" },
];

const TIPS = [
  { icon: Target, text: "Crie mais metas para aumentar seu score", impact: "+50" },
  { icon: CreditCard, text: "Pague suas faturas em dia", impact: "+30" },
  { icon: Wallet, text: "Mantenha um saldo de emergência", impact: "+40" },
];

export function ScoreCollapsible() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const { data: scoreData } = useScore();

  const score = scoreData?.score ?? 720;
  const maxScore = scoreData?.maxScore ?? 1000;
  const scoreLevel = getScoreLevel(score);
  
  const breakdown = scoreData?.breakdown ?? {
    transactions: 180,
    streak: 120,
    goals: 200,
    budget: 150,
    engagement: 70,
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden border border-border">
      {/* Header - sempre visível */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div 
            className="w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${scoreLevel.color}20` }}
          >
            <Zap className="w-3.5 h-3.5" style={{ color: scoreLevel.color }} />
          </div>
          <span className="text-sm font-semibold text-foreground">Score AZA</span>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Score badge preview */}
          <div className="flex items-center gap-1.5">
            <span 
              className="text-lg font-black"
              style={{ color: scoreLevel.color }}
            >
              {score}
            </span>
            <span className="text-xs text-muted-foreground">/{maxScore}</span>
          </div>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          </motion.div>
        </div>
      </button>

      {/* Conteúdo colapsável */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              
              {/* Score Visual */}
              <div className="text-center py-2">
                <div 
                  className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full mb-2"
                  style={{ backgroundColor: `${scoreLevel.color}15`, color: scoreLevel.color }}
                >
                  <Zap className="w-4 h-4" />
                  <span className="font-bold text-sm">{scoreLevel.level}</span>
                </div>
                <p className="text-xs text-muted-foreground">{scoreLevel.message}</p>
                
                {/* Progress bar */}
                <div className="mt-3 h-2.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(score / maxScore) * 100}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: scoreLevel.color }}
                  />
                </div>
              </div>

              {/* Breakdown - Top 3 */}
              <div className="space-y-2">
                <span className="text-xs font-medium text-muted-foreground">Composição do Score</span>
                {BREAKDOWN_ITEMS.slice(0, 3).map((item, index) => {
                  const value = breakdown[item.key as keyof typeof breakdown] ?? 0;
                  return (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{item.icon}</span>
                          <span className="text-xs font-medium text-foreground">{item.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{value}/{item.max}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${(value / item.max) * 100}%` }}
                          transition={{ duration: 0.5, delay: 0.2 + index * 0.05 }}
                          className="h-full rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Dica rápida */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center gap-3 bg-primary/10 rounded-xl p-3"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-foreground line-clamp-2">{TIPS[0].text}</span>
                </div>
                <span className="text-xs font-bold text-success flex-shrink-0">{TIPS[0].impact}</span>
              </motion.div>

              {/* Ver mais */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                onClick={() => navigate("/score")}
                className="w-full flex items-center justify-center gap-2 py-2 text-primary text-sm font-medium hover:bg-primary/5 rounded-lg transition-colors"
              >
                Ver detalhes completos
                <ChevronRight className="w-4 h-4" />
              </motion.button>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
