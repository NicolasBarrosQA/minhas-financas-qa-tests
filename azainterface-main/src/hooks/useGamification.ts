import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BadgeRarity, ScoreLevel, XPLevel } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';

const GAMIFICATION_KEY = ['gamification'];

const MOCK_XP_STATUS = {
  currentXp: 0,
  level: 'INICIANTE' as XPLevel,
  xpToNextLevel: 500,
  totalXpForNextLevel: 500,
};

const MOCK_STREAK = {
  currentStreak: 0,
  longestStreak: 0,
  lastActivityDate: null,
  freezesAvailable: 0,
  nextMilestone: { days: 3, xp: 30, title: 'Primeiros Passos' },
};

const MOCK_SCORE = {
  score: 0,
  maxScore: 1000,
  breakdown: {
    transactions: 0,
    streak: 0,
    goals: 0,
    budget: 0,
    engagement: 0,
  },
};

const MOCK_CHALLENGES = {
  active: [],
  available: [],
};

const MOCK_BADGES: Array<{
  id: string;
  name: string;
  icon: string;
  rarity: BadgeRarity;
  earned: boolean;
}> = [];

export function useXPStatus() {
  return useQuery({
    queryKey: [...GAMIFICATION_KEY, 'xp'],
    queryFn: async () => MOCK_XP_STATUS,
    staleTime: Infinity,
  });
}

export function useXPHistory() {
  return useQuery({
    queryKey: [...GAMIFICATION_KEY, 'xp', 'history'],
    queryFn: async () => [],
    staleTime: Infinity,
  });
}

export function useLeaderboard() {
  return useQuery({
    queryKey: [...GAMIFICATION_KEY, 'leaderboard'],
    queryFn: async () => [],
    staleTime: Infinity,
  });
}

export function useStreak() {
  return useQuery({
    queryKey: [...GAMIFICATION_KEY, 'streak'],
    queryFn: async () => MOCK_STREAK,
    staleTime: Infinity,
  });
}

export function useStreakFreeze() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => ({ streakFreezesRemaining: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GAMIFICATION_KEY });
      toast({
        title: 'Streak congelado',
        description: 'Nenhum congelamento disponivel no momento.',
      });
    },
  });
}

export function useScore() {
  return useQuery({
    queryKey: [...GAMIFICATION_KEY, 'score'],
    queryFn: async () => MOCK_SCORE,
    staleTime: Infinity,
  });
}

export function useBadges() {
  return useQuery({
    queryKey: [...GAMIFICATION_KEY, 'badges'],
    queryFn: async () => MOCK_BADGES,
    staleTime: Infinity,
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: [...GAMIFICATION_KEY, 'achievements'],
    queryFn: async () => [],
    staleTime: Infinity,
  });
}

export function useChallenges() {
  return useQuery({
    queryKey: [...GAMIFICATION_KEY, 'challenges'],
    queryFn: async () => MOCK_CHALLENGES,
    staleTime: Infinity,
  });
}

export function useStartChallenge() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => ({ id, title: 'Desafio', xpReward: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...GAMIFICATION_KEY, 'challenges'] });
      toast({
        title: 'Sem desafios disponiveis',
      });
    },
  });
}

export const XP_LEVELS: Record<XPLevel, { minXp: number; maxXp: number; color: string; icon: string }> = {
  INICIANTE: { minXp: 0, maxXp: 499, color: '#9CA3AF', icon: 'seedling' },
  APRENDIZ: { minXp: 500, maxXp: 1499, color: '#60A5FA', icon: 'book' },
  CONTROLADO: { minXp: 1500, maxXp: 3999, color: '#34D399', icon: 'scale' },
  EXPERT: { minXp: 4000, maxXp: 9999, color: '#A78BFA', icon: 'star' },
  LENDARIO: { minXp: 10000, maxXp: Infinity, color: '#F59E0B', icon: 'crown' },
};

export function getLevelInfo(xp: number) {
  for (const [level, info] of Object.entries(XP_LEVELS)) {
    if (xp >= info.minXp && xp < info.maxXp) {
      return { level: level as XPLevel, ...info };
    }
  }
  return { level: 'INICIANTE' as XPLevel, ...XP_LEVELS.INICIANTE };
}

export function getScoreLevel(score: number): { level: ScoreLevel; color: string; message: string } {
  const percentage = score / 1000;

  if (percentage >= 0.8) {
    return { level: 'EXCELENTE', color: '#10B981', message: 'Saude financeira excelente.' };
  }
  if (percentage >= 0.6) {
    return { level: 'BOM', color: '#34D399', message: 'Bom desempenho financeiro.' };
  }
  if (percentage >= 0.4) {
    return { level: 'REGULAR', color: '#F59E0B', message: 'Ha espaco para melhorar.' };
  }
  return { level: 'ATENCAO', color: '#EF4444', message: 'Vamos melhorar sua organizacao financeira.' };
}

export const STREAK_MILESTONES = [
  { days: 3, xp: 30, title: 'Primeiros Passos' },
  { days: 7, xp: 100, title: 'Consistencia' },
  { days: 14, xp: 200, title: 'Dedicacao' },
  { days: 30, xp: 500, title: 'Mestre do Habito' },
  { days: 60, xp: 1000, title: 'Lenda da AZA' },
  { days: 100, xp: 2000, title: 'Elite Financeira' },
  { days: 365, xp: 5000, title: 'Ano de Ouro' },
];

export const BADGE_RARITY: Record<BadgeRarity, { color: string; chance: string }> = {
  COMUM: { color: '#9CA3AF', chance: '60%' },
  RARA: { color: '#60A5FA', chance: '25%' },
  EPICA: { color: '#A78BFA', chance: '10%' },
  LENDARIA: { color: '#F59E0B', chance: '5%' },
};

export const ACHIEVEMENT_CATEGORIES = {
  TRANSACTIONS: 'Transacoes',
  STREAK: 'Sequencia',
  GOALS: 'Metas',
  BUDGET: 'Orcamentos',
  CARDS: 'Cartoes',
  SOCIAL: 'Social',
} as const;

export const ANTIFRAUD_LIMITS = {
  dailyXpCap: 500,
  transactionXpCap: 100,
  goalXpCap: 300,
  weightDecayDays: 7,
  minGoalDays: 7,
};
