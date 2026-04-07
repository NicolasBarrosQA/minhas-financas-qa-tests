import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Target, Flame, Clock, CheckCircle, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useChallenges, useStartChallenge } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

type TabType = "active" | "available" | "completed";

export function Missions() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("active");
  
  const { data: challengesData, isLoading } = useChallenges();
  const startChallenge = useStartChallenge();

  // Mock data expandido
  const activeMissions = [
    { id: '1', title: 'Registre seus gastos', description: 'Adicione 3 transações hoje', xp: 50, progress: 66, deadline: 'Hoje', type: 'DIARIO' },
    { id: '2', title: 'Meta diária', description: 'Gaste menos de R$100 hoje', xp: 100, progress: 45, deadline: 'Hoje', type: 'DIARIO' },
    { id: '3', title: 'Economizador semanal', description: 'Economize R$200 esta semana', xp: 200, progress: 30, deadline: '5 dias', type: 'SEMANAL' },
  ];

  const availableMissions = [
    { id: '4', title: 'Primeira meta', description: 'Crie sua primeira meta de economia', xp: 150, difficulty: 'FACIL' },
    { id: '5', title: 'Orçamento mestre', description: 'Crie um orçamento para cada categoria principal', xp: 300, difficulty: 'MEDIO' },
    { id: '6', title: 'Investidor iniciante', description: 'Registre seu primeiro investimento', xp: 250, difficulty: 'MEDIO' },
    { id: '7', title: 'Streak de fogo', description: 'Mantenha uma sequência de 7 dias', xp: 500, difficulty: 'DIFICIL' },
  ];

  const completedMissions = [
    { id: '8', title: 'Primeiro acesso', description: 'Finalize seu primeiro login no app', xp: 50, completedAt: '2025-01-20' },
    { id: '9', title: 'Primeira transação', description: 'Registre sua primeira transação', xp: 30, completedAt: '2025-01-21' },
    { id: '10', title: 'Explorador', description: 'Visite todas as telas do app', xp: 40, completedAt: '2025-01-22' },
  ];

  const handleStartMission = (missionId: string) => {
    startChallenge.mutate(missionId);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'FACIL': return 'bg-success/20 text-success';
      case 'MEDIO': return 'bg-warning/20 text-warning';
      case 'DIFICIL': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted';
    }
  };

  const tabs = [
    { key: "active", label: "Ativos", count: activeMissions.length },
    { key: "available", label: "Disponíveis", count: availableMissions.length },
    { key: "completed", label: "Concluídos", count: completedMissions.length },
  ];

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Missões</h1>
              <p className="text-sm text-muted-foreground">Complete desafios e ganhe XP</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-500" />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex bg-muted rounded-xl p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabType)}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
                  activeTab === tab.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground"
                }`}
              >
                {tab.label}
                <span className="text-xs opacity-60">({tab.count})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {activeTab === "active" && activeMissions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-2xl bg-card border border-border"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">{mission.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      {mission.deadline}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">{mission.description}</p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progresso</span>
                      <span className="font-medium">{mission.progress}%</span>
                    </div>
                    <Progress value={mission.progress} className="h-2" />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-sm font-bold text-primary">+{mission.xp} XP</span>
                <Button size="sm" onClick={() => navigate("/transaction/new?type=expense")}>
                  Continuar
                </Button>
              </div>
            </motion.div>
          ))}

          {activeTab === "available" && availableMissions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-2xl bg-card border border-border"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Play className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold">{mission.title}</h3>
                    <Badge className={`text-xs ${getDifficultyColor(mission.difficulty)}`}>
                      {mission.difficulty}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{mission.description}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <span className="text-sm font-bold text-primary">+{mission.xp} XP</span>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleStartMission(mission.id)}
                  disabled={startChallenge.isPending}
                >
                  Iniciar Missão
                </Button>
              </div>
            </motion.div>
          ))}

          {activeTab === "completed" && completedMissions.map((mission, index) => (
            <motion.div
              key={mission.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="p-4 rounded-2xl bg-card border border-success/20"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{mission.title}</h3>
                  <p className="text-sm text-muted-foreground">{mission.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Concluído em {new Date(mission.completedAt).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <span className="text-sm font-bold text-success">+{mission.xp} XP</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
