import { motion } from "framer-motion";
import { ArrowLeft, Zap, TrendingUp, Calendar, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useXPHistory, useXPStatus, XP_LEVELS } from "@/hooks/useGamification";

export function XPHistory() {
  const navigate = useNavigate();
  const { data: xpData } = useXPStatus();
  const { data: historyData = [] } = useXPHistory();

  // Mock data expandido
  const history = [
    { id: '1', amount: 50, reason: 'Transação registrada', date: '2025-01-27T14:30:00', type: 'transaction' },
    { id: '2', amount: 100, reason: 'Desafio completado: Meta diária', date: '2025-01-27T10:15:00', type: 'challenge' },
    { id: '3', amount: 30, reason: 'Login diário (streak)', date: '2025-01-27T08:00:00', type: 'streak' },
    { id: '4', amount: 50, reason: 'Transação registrada', date: '2025-01-26T20:45:00', type: 'transaction' },
    { id: '5', amount: 50, reason: 'Transação registrada', date: '2025-01-26T15:20:00', type: 'transaction' },
    { id: '6', amount: 200, reason: 'Conquista: Economista', date: '2025-01-26T12:00:00', type: 'achievement' },
    { id: '7', amount: 30, reason: 'Login diário (streak)', date: '2025-01-26T08:00:00', type: 'streak' },
    { id: '8', amount: 150, reason: 'Orçamento completado no prazo', date: '2025-01-25T23:59:00', type: 'budget' },
    { id: '9', amount: 50, reason: 'Transação registrada', date: '2025-01-25T18:30:00', type: 'transaction' },
    { id: '10', amount: 30, reason: 'Login diário (streak)', date: '2025-01-25T08:00:00', type: 'streak' },
  ];

  const currentXp = xpData?.currentXp ?? 2350;
  const level = xpData?.level ?? 'CONTROLADO';
  const levelInfo = XP_LEVELS[level];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'transaction': return '📝';
      case 'challenge': return '🎯';
      case 'streak': return '🔥';
      case 'achievement': return '🏆';
      case 'budget': return '📊';
      default: return '⚡';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'transaction': return '#3B82F6';
      case 'challenge': return '#10B981';
      case 'streak': return '#F59E0B';
      case 'achievement': return '#8B5CF6';
      case 'budget': return '#EC4899';
      default: return '#6B7280';
    }
  };

  // Agrupar por data
  const groupedHistory = history.reduce((acc, item) => {
    const date = new Date(item.date).toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(item);
    return acc;
  }, {} as Record<string, typeof history>);

  const totalToday = history
    .filter(h => new Date(h.date).toDateString() === new Date().toDateString())
    .reduce((sum, h) => sum + h.amount, 0);

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
              <h1 className="text-xl font-bold">Histórico de XP</h1>
              <p className="text-sm text-muted-foreground">Seus ganhos de experiência</p>
            </div>
          </div>

          {/* XP Summary Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">XP Total</p>
                <p className="text-3xl font-black" style={{ color: levelInfo.color }}>
                  {currentXp.toLocaleString()}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-lg">{levelInfo.icon}</span>
                  <span className="text-sm font-medium" style={{ color: levelInfo.color }}>
                    {level}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-xl font-bold text-success">+{totalToday}</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* History List */}
        <div className="p-4">
          {Object.entries(groupedHistory).map(([date, items], groupIndex) => (
            <motion.div
              key={date}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: groupIndex * 0.1 }}
              className="mb-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-medium text-muted-foreground capitalize">{date}</h3>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: groupIndex * 0.1 + index * 0.03 }}
                    className="p-3 rounded-xl bg-card border border-border flex items-center gap-3"
                  >
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ backgroundColor: `${getTypeColor(item.type)}20` }}
                    >
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{item.reason}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <span 
                      className="font-bold text-sm"
                      style={{ color: getTypeColor(item.type) }}
                    >
                      +{item.amount} XP
                    </span>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
}
