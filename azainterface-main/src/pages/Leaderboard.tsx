import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Medal, Crown, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useLeaderboard, XP_LEVELS } from "@/hooks/useGamification";
import type { XPLevel } from "@/types/entities";

export function Leaderboard() {
  const navigate = useNavigate();
  const { data: leaderboardData } = useLeaderboard();

  // Mock data expandido
  const topUsers = [
    { position: 1, name: 'Ana Silva', xp: 8500, avatar: '👩', level: 'EXPERT' as XPLevel },
    { position: 2, name: 'Carlos Souza', xp: 7200, avatar: '👨', level: 'EXPERT' as XPLevel },
    { position: 3, name: 'Maria Oliveira', xp: 6800, avatar: '👩‍🦰', level: 'CONTROLADO' as XPLevel },
    { position: 4, name: 'João Pedro', xp: 5500, avatar: '👦', level: 'CONTROLADO' as XPLevel },
    { position: 5, name: 'Fernanda Lima', xp: 4200, avatar: '👧', level: 'CONTROLADO' as XPLevel },
    { position: 6, name: 'Rafael Santos', xp: 3800, avatar: '🧔', level: 'APRENDIZ' as XPLevel },
    { position: 7, name: 'Juliana Costa', xp: 3200, avatar: '👩‍💼', level: 'APRENDIZ' as XPLevel },
    { position: 8, name: 'Lucas Mendes', xp: 2800, avatar: '👨‍💻', level: 'APRENDIZ' as XPLevel },
    { position: 9, name: 'Patrícia Alves', xp: 2500, avatar: '👩‍🎓', level: 'APRENDIZ' as XPLevel },
    { position: 10, name: 'Bruno Ferreira', xp: 2100, avatar: '🧑', level: 'INICIANTE' as XPLevel },
  ];

  // Usuário atual (mockado como posição 8)
  const currentUser = {
    position: 8,
    name: 'Você (Nico)',
    xp: 2350,
    avatar: '🐷',
    level: 'CONTROLADO' as XPLevel,
    isCurrentUser: true,
  };

  const getPositionIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2: return <Medal className="w-6 h-6 text-gray-400" />;
      case 3: return <Medal className="w-6 h-6 text-amber-600" />;
      default: return <span className="text-lg font-bold text-muted-foreground">{position}</span>;
    }
  };

  const getPositionStyle = (position: number) => {
    switch (position) {
      case 1: return "bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30";
      case 2: return "bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30";
      case 3: return "bg-gradient-to-r from-amber-600/20 to-amber-700/10 border-amber-600/30";
      default: return "bg-card border-border";
    }
  };

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Ranking</h1>
              <p className="text-sm text-muted-foreground">Top jogadores do AZA</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </div>

        {/* Your Position */}
        <div className="px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-primary/10 border-2 border-primary mb-6"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
                {currentUser.avatar}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold">{currentUser.name}</span>
                  <span 
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ 
                      backgroundColor: `${XP_LEVELS[currentUser.level].color}20`, 
                      color: XP_LEVELS[currentUser.level].color 
                    }}
                  >
                    {currentUser.level}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{currentUser.xp.toLocaleString()} XP</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-primary">#{currentUser.position}</span>
              </div>
            </div>
          </motion.div>

          {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-2 mb-6">
            {/* 2nd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-gray-400/20 border-2 border-gray-400/30 flex items-center justify-center text-2xl">
                {topUsers[1].avatar}
              </div>
              <p className="text-xs font-medium truncate w-16">{topUsers[1].name.split(' ')[0]}</p>
              <p className="text-xs text-muted-foreground">{topUsers[1].xp.toLocaleString()}</p>
              <div className="mt-2 h-20 w-16 bg-gray-400/20 rounded-t-xl flex items-start justify-center pt-2">
                <Medal className="w-6 h-6 text-gray-400" />
              </div>
            </motion.div>

            {/* 1st Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="text-center"
            >
              <div className="w-20 h-20 mx-auto mb-2 rounded-full bg-yellow-500/20 border-2 border-yellow-500/30 flex items-center justify-center text-3xl">
                {topUsers[0].avatar}
              </div>
              <p className="text-sm font-bold truncate w-20">{topUsers[0].name.split(' ')[0]}</p>
              <p className="text-xs text-muted-foreground">{topUsers[0].xp.toLocaleString()}</p>
              <div className="mt-2 h-28 w-20 bg-yellow-500/20 rounded-t-xl flex items-start justify-center pt-2">
                <Crown className="w-8 h-8 text-yellow-500" />
              </div>
            </motion.div>

            {/* 3rd Place */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="text-center"
            >
              <div className="w-14 h-14 mx-auto mb-2 rounded-full bg-amber-600/20 border-2 border-amber-600/30 flex items-center justify-center text-xl">
                {topUsers[2].avatar}
              </div>
              <p className="text-xs font-medium truncate w-14">{topUsers[2].name.split(' ')[0]}</p>
              <p className="text-xs text-muted-foreground">{topUsers[2].xp.toLocaleString()}</p>
              <div className="mt-2 h-14 w-14 bg-amber-600/20 rounded-t-xl flex items-start justify-center pt-2">
                <Medal className="w-5 h-5 text-amber-600" />
              </div>
            </motion.div>
          </div>

          {/* Full List */}
          <div className="space-y-2">
            {topUsers.slice(3).map((user, index) => (
              <motion.div
                key={user.position}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + index * 0.03 }}
                className={`p-3 rounded-xl border ${getPositionStyle(user.position)}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    {getPositionIcon(user.position)}
                  </div>
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-lg">
                    {user.avatar}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.name}</p>
                    <div className="flex items-center gap-2">
                      <span 
                        className="text-xs"
                        style={{ color: XP_LEVELS[user.level].color }}
                      >
                        {XP_LEVELS[user.level].icon} {user.level}
                      </span>
                    </div>
                  </div>
                  <span className="font-bold text-sm">{user.xp.toLocaleString()} XP</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
