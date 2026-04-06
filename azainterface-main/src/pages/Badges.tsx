import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Award, Lock, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useBadges, BADGE_RARITY } from "@/hooks/useGamification";
import type { BadgeRarity } from "@/types/entities";

type FilterType = "all" | "earned" | "locked";

export function Badges() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");
  
  const { data: badges = [] } = useBadges();

  // Mock badges expandido
  const allBadges = [
    { id: '1', name: 'Primeiro Passo', icon: '🌱', rarity: 'COMUM' as BadgeRarity, earned: true, description: 'Começou a jornada no AZA' },
    { id: '2', name: 'Streak Master', icon: '🔥', rarity: 'RARA' as BadgeRarity, earned: true, description: '7 dias de sequência' },
    { id: '3', name: 'Economista', icon: '💰', rarity: 'EPICA' as BadgeRarity, earned: true, description: 'Economizou R$1.000' },
    { id: '4', name: 'Organizador', icon: '📁', rarity: 'COMUM' as BadgeRarity, earned: true, description: 'Criou categorias personalizadas' },
    { id: '5', name: 'Meta Alcançada', icon: '🎯', rarity: 'RARA' as BadgeRarity, earned: false, description: 'Complete sua primeira meta' },
    { id: '6', name: 'Orçamento Perfeito', icon: '📊', rarity: 'EPICA' as BadgeRarity, earned: false, description: 'Não estoure orçamentos por 30 dias' },
    { id: '7', name: 'Investidor', icon: '📈', rarity: 'RARA' as BadgeRarity, earned: false, description: 'Faça seu primeiro investimento' },
    { id: '8', name: 'Lenda do AZA', icon: '👑', rarity: 'LENDARIA' as BadgeRarity, earned: false, description: '100 dias de uso consecutivo' },
    { id: '9', name: 'Livre de Dívidas', icon: '🎊', rarity: 'EPICA' as BadgeRarity, earned: false, description: 'Quite todas as faturas' },
    { id: '10', name: 'Milionário', icon: '💎', rarity: 'LENDARIA' as BadgeRarity, earned: false, description: 'Acumule R$1.000.000' },
  ];

  const filteredBadges = allBadges.filter(b => {
    if (filter === "earned") return b.earned;
    if (filter === "locked") return !b.earned;
    return true;
  });

  const earnedCount = allBadges.filter(b => b.earned).length;

  const getRarityStyle = (rarity: BadgeRarity) => {
    const info = BADGE_RARITY[rarity];
    return {
      borderColor: info.color,
      backgroundColor: `${info.color}15`,
    };
  };

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
              <h1 className="text-xl font-bold">Coleção de Badges</h1>
              <p className="text-sm text-muted-foreground">
                {earnedCount} de {allBadges.length} coletados
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Award className="w-5 h-5 text-primary" />
              <span className="font-bold text-primary">{earnedCount}</span>
            </div>
          </div>

          {/* Rarity Legend */}
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
            {Object.entries(BADGE_RARITY).map(([rarity, info]) => (
              <div
                key={rarity}
                className="flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap"
                style={{ backgroundColor: `${info.color}20`, color: info.color }}
              >
                <Sparkles className="w-3 h-3" />
                {rarity} ({info.chance})
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            {[
              { key: "all", label: "Todos" },
              { key: "earned", label: "Coletados" },
              { key: "locked", label: "Bloqueados" },
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
            {filteredBadges.map((badge, index) => (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className={`relative p-4 rounded-2xl border-2 ${
                  badge.earned ? "" : "opacity-50 grayscale"
                }`}
                style={getRarityStyle(badge.rarity)}
              >
                {!badge.earned && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                
                <div className="text-4xl mb-2 text-center">{badge.icon}</div>
                <h3 className="font-semibold text-sm text-center mb-1">{badge.name}</h3>
                <p className="text-xs text-muted-foreground text-center mb-2">
                  {badge.description}
                </p>
                
                <div 
                  className="text-xs font-bold text-center py-1 rounded-full"
                  style={{ backgroundColor: BADGE_RARITY[badge.rarity].color, color: 'white' }}
                >
                  {badge.rarity}
                </div>
              </motion.div>
            ))}
          </div>

          {filteredBadges.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Nenhum badge encontrado</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
