import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Star, Lock, Filter, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useAchievements } from "@/hooks/useGamification";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

type FilterType = "all" | "unlocked" | "locked";

export function Achievements() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  
  const { data: achievements = [], isLoading } = useAchievements();

  // Mock achievements completo
  const allAchievements = [
    { id: '1', title: 'Primeiro Passo', description: 'Registre sua primeira transação', unlocked: true, xp: 50, icon: '🌱', category: 'Início' },
    { id: '2', title: 'Organizador', description: 'Crie 3 categorias personalizadas', unlocked: true, xp: 100, icon: '📁', category: 'Organização' },
    { id: '3', title: 'Meta Alcançada', description: 'Complete sua primeira meta', unlocked: true, xp: 200, icon: '🎯', category: 'Metas' },
    { id: '4', title: 'Streak de 7 dias', description: 'Mantenha uma sequência de 7 dias', unlocked: true, xp: 150, icon: '🔥', category: 'Consistência' },
    { id: '5', title: 'Economista', description: 'Economize R$1.000 em um mês', unlocked: false, xp: 300, icon: '💰', category: 'Economia' },
    { id: '6', title: 'Orçamento Perfeito', description: 'Não estoure nenhum orçamento por 30 dias', unlocked: false, xp: 250, icon: '📊', category: 'Orçamentos' },
    { id: '7', title: 'Investidor', description: 'Faça seu primeiro investimento', unlocked: false, xp: 200, icon: '📈', category: 'Investimentos' },
    { id: '8', title: 'Mestre do Controle', description: 'Registre 100 transações', unlocked: false, xp: 500, icon: '👑', category: 'Controle' },
    { id: '9', title: 'Streak Lendário', description: 'Mantenha uma sequência de 30 dias', unlocked: false, xp: 1000, icon: '⚡', category: 'Consistência' },
    { id: '10', title: 'Livre de Dívidas', description: 'Quite todas as faturas do mês', unlocked: false, xp: 400, icon: '🎊', category: 'Cartões' },
  ];

  const filteredAchievements = allAchievements
    .filter(a => {
      if (filter === "unlocked") return a.unlocked;
      if (filter === "locked") return !a.unlocked;
      return true;
    })
    .filter(a => 
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase())
    );

  const unlockedCount = allAchievements.filter(a => a.unlocked).length;

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
              <h1 className="text-xl font-bold">Conquistas</h1>
              <p className="text-sm text-muted-foreground">
                {unlockedCount} de {allAchievements.length} desbloqueadas
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Trophy className="w-5 h-5 text-primary" />
              <span className="font-bold text-primary">{unlockedCount}</span>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar conquista..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: "all", label: "Todas" },
              { key: "unlocked", label: "Desbloqueadas" },
              { key: "locked", label: "Bloqueadas" },
            ].map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key as FilterType)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filter === f.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {filteredAchievements.map((achievement, index) => (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`relative p-4 rounded-2xl border ${
                  achievement.unlocked
                    ? "bg-card border-primary/20"
                    : "bg-muted/50 border-border opacity-60"
                }`}
              >
                {!achievement.unlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <h3 className="font-semibold text-sm mb-1">{achievement.title}</h3>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {achievement.description}
                </p>
                
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    {achievement.category}
                  </Badge>
                  <span className="text-xs font-bold text-primary">+{achievement.xp} XP</span>
                </div>
              </motion.div>
            ))}
          </div>

          {filteredAchievements.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma conquista encontrada</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
