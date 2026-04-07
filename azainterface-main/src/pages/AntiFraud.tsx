import { motion } from "framer-motion";
import { ArrowLeft, Shield, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { ANTIFRAUD_LIMITS } from "@/hooks/useGamification";
import { Progress } from "@/components/ui/progress";

export function AntiFraud() {
  const navigate = useNavigate();

  // Mock data
  const status = {
    isLimited: false,
    dailyXpUsed: 180,
    dailyXpLimit: ANTIFRAUD_LIMITS.dailyXpCap,
    recentEvents: [
      { type: 'transaction', xpAmount: 50, timestamp: '2025-01-27T14:30:00', status: 'APROVED' as const },
      { type: 'challenge', xpAmount: 100, timestamp: '2025-01-27T10:15:00', status: 'APROVED' as const },
      { type: 'streak', xpAmount: 30, timestamp: '2025-01-27T08:00:00', status: 'APROVED' as const },
    ],
  };

  const usagePercentage = (status.dailyXpUsed / status.dailyXpLimit) * 100;

  const limits = [
    { label: 'XP diário máximo', value: `${ANTIFRAUD_LIMITS.dailyXpCap} XP`, description: 'Limite de XP que você pode ganhar por dia' },
    { label: 'XP por transação', value: `${ANTIFRAUD_LIMITS.transactionXpCap} XP`, description: 'Máximo de XP por registro de transação' },
    { label: 'XP por meta', value: `${ANTIFRAUD_LIMITS.goalXpCap} XP`, description: 'Máximo de XP ao completar uma meta' },
    { label: 'Dias mínimos para meta', value: `${ANTIFRAUD_LIMITS.minGoalDays} dias`, description: 'Tempo mínimo para completar uma meta e ganhar XP' },
  ];

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
              <h1 className="text-xl font-bold">Sistema Anti-Fraude</h1>
              <p className="text-sm text-muted-foreground">Status e limites de XP</p>
            </div>
          </div>

          {/* Status Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl mb-6 ${
              status.isLimited 
                ? "bg-destructive/10 border border-destructive/30" 
                : "bg-success/10 border border-success/30"
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {status.isLimited ? (
                <AlertTriangle className="w-6 h-6 text-destructive" />
              ) : (
                <CheckCircle className="w-6 h-6 text-success" />
              )}
              <div>
                <h2 className="font-bold">
                  {status.isLimited ? "Limite atingido" : "Status normal"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {status.isLimited 
                    ? "Você atingiu o limite diário de XP" 
                    : "Você está dentro dos limites normais"}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>XP ganho hoje</span>
                <span className="font-bold">{status.dailyXpUsed}/{status.dailyXpLimit}</span>
              </div>
              <Progress value={usagePercentage} className="h-2" />
            </div>
          </motion.div>

          {/* Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-primary/5 border border-primary/20 mb-6"
          >
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <h3 className="font-medium mb-1">Por que existem limites?</h3>
                <p className="text-sm text-muted-foreground">
                  Os limites garantem uma experiência justa para todos os jogadores. 
                  Eles previnem abusos e incentivam o uso consistente do app ao longo do tempo.
                </p>
              </div>
            </div>
          </motion.div>

          {/* Limits List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="aza-card p-4 mb-6"
          >
            <h2 className="font-bold mb-4">Limites do Sistema</h2>
            <div className="space-y-4">
              {limits.map((limit, index) => (
                <motion.div
                  key={limit.label}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.05 }}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div>
                    <p className="font-medium text-sm">{limit.label}</p>
                    <p className="text-xs text-muted-foreground">{limit.description}</p>
                  </div>
                  <span className="font-bold text-primary">{limit.value}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Recent Events */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="aza-card p-4"
          >
            <h2 className="font-bold mb-4">Eventos Recentes</h2>
            <div className="space-y-3">
              {status.recentEvents.map((event, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 + index * 0.05 }}
                  className="flex items-center justify-between py-2"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.status === 'APROVED' ? 'bg-success' :
                      event.status === 'LIMITED' ? 'bg-warning' : 'bg-muted'
                    }`} />
                    <div>
                      <p className="text-sm font-medium capitalize">{event.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-success">+{event.xpAmount} XP</span>
                    <p className="text-xs text-muted-foreground">{event.status}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
