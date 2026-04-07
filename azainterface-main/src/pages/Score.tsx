import { motion } from "framer-motion";
import { ArrowLeft, Zap, TrendingUp, TrendingDown, Target, Wallet, CreditCard, Lightbulb } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useScore, getScoreLevel } from "@/hooks/useGamification";
import { Progress } from "@/components/ui/progress";
import { Mascot } from "@/components/Mascot";

export function Score() {
  const navigate = useNavigate();
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

  const tips = [
    { icon: Target, text: "Crie mais metas para aumentar seu score de objetivos", impact: "+50" },
    { icon: CreditCard, text: "Pague suas faturas em dia para melhorar a pontuação", impact: "+30" },
    { icon: Wallet, text: "Mantenha um saldo de emergência na sua conta principal", impact: "+40" },
  ];

  const breakdownItems = [
    { label: "Transações", value: breakdown.transactions, max: 200, icon: "📝", color: "#3B82F6" },
    { label: "Sequência", value: breakdown.streak, max: 150, icon: "🔥", color: "#F59E0B" },
    { label: "Metas", value: breakdown.goals, max: 250, icon: "🎯", color: "#10B981" },
    { label: "Orçamentos", value: breakdown.budget, max: 200, icon: "📊", color: "#8B5CF6" },
    { label: "Engajamento", value: breakdown.engagement, max: 200, icon: "⚡", color: "#EC4899" },
  ];

  const getMascotMood = () => {
    if (score >= 800) return "rich";
    if (score >= 600) return "happy";
    if (score >= 400) return "confused";
    return "sad";
  };

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="px-4 py-4">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Score Financeiro</h1>
              <p className="text-sm text-muted-foreground">Sua saúde financeira no AZA</p>
            </div>
          </div>

          {/* Main Score Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="aza-card p-6 text-center mb-6"
          >
            <div className="flex justify-center mb-4">
              <Mascot mood={getMascotMood()} size="lg" showBubble={false} />
            </div>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", delay: 0.2 }}
              className="mb-4"
            >
              <span className="text-6xl font-black" style={{ color: scoreLevel.color }}>
                {score}
              </span>
              <span className="text-2xl text-muted-foreground">/{maxScore}</span>
            </motion.div>

            <div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4"
              style={{ backgroundColor: `${scoreLevel.color}20`, color: scoreLevel.color }}
            >
              <Zap className="w-4 h-4" />
              <span className="font-bold">{scoreLevel.level}</span>
            </div>

            <p className="text-sm text-muted-foreground">{scoreLevel.message}</p>

            {/* Progress bar */}
            <div className="mt-6">
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(score / maxScore) * 100}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                  className="h-full rounded-full"
                  style={{ backgroundColor: scoreLevel.color }}
                />
              </div>
            </div>
          </motion.div>

          {/* Breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="aza-card p-4 mb-6"
          >
            <h2 className="font-bold mb-4">Como é calculado</h2>
            <div className="space-y-4">
              {breakdownItems.map((item, index) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <span className="text-sm font-bold">{item.value}/{item.max}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(item.value / item.max) * 100}%` }}
                      transition={{ duration: 0.5, delay: 0.4 + index * 0.05 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Tips */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-6"
          >
            <h2 className="font-bold mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-warning" />
              Dicas para melhorar
            </h2>
            <div className="space-y-3">
              {tips.map((tip, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + index * 0.05 }}
                  className="p-4 rounded-xl bg-card border border-border flex items-start gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <tip.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{tip.text}</p>
                  </div>
                  <span className="text-xs font-bold text-success">{tip.impact} pts</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
