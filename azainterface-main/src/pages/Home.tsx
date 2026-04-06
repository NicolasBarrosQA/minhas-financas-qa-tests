import { useState } from "react";
import { motion } from "framer-motion";
import { Bell, ChevronRight, CreditCard, Eye, EyeOff, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { AccountsCollapsible } from "@/components/AccountsCollapsible";
import { CardsCollapsible } from "@/components/CardsCollapsible";
import { Mascot } from "@/components/Mascot";
import { StateWrapper } from "@/components/StateWrapper";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/providers/AuthProvider";
import { useProfile } from "@/hooks/useProfile";

export function Home() {
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { data: dashboardData, isLoading, isError } = useDashboard();

  const totalBalance = dashboardData?.totalBalance ?? 0;
  const monthlyIncome = dashboardData?.monthlyIncome ?? 0;
  const monthlyExpenses = dashboardData?.monthlyExpenses ?? 0;
  const userDisplayName = profile?.name || user?.email?.split("@")[0] || "Usuário";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const mascotMood = totalBalance >= 0 ? "happy" : "confused";

  return (
    <MainLayout>
      <div className="px-4 pt-4 pb-4">
        <StateWrapper
          isLoading={isLoading}
          isError={isError}
          isEmpty={false}
          loadingText="Carregando..."
        >
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <Mascot mood={mascotMood} size="sm" showBubble={false} />
                <div>
                  <h1 className="text-lg font-bold text-foreground">Olá, {userDisplayName}!</h1>
                  <p className="text-xs text-muted-foreground">Seu resumo financeiro de hoje</p>
                </div>
              </div>

              <button
                onClick={() => navigate("/notifications")}
                className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm border border-border relative"
              >
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="absolute top-2 right-2 w-2 h-2 bg-destructive rounded-full" />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-5 mb-4 shadow-lg"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-amber-900/70 font-medium mb-1">Saldo total</p>
                <motion.p
                  key={showBalance ? "visible" : "hidden"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-3xl font-black text-amber-950"
                >
                  {showBalance ? formatCurrency(totalBalance) : "R$ ••••••"}
                </motion.p>
              </div>
              <button
                onClick={() => setShowBalance(!showBalance)}
                className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm"
              >
                {showBalance ? (
                  <Eye className="w-5 h-5 text-amber-900" />
                ) : (
                  <EyeOff className="w-5 h-5 text-amber-900" />
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                    <TrendingUp className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-amber-900/80 font-medium">Entradas</span>
                </div>
                <p className="text-lg font-bold text-emerald-700">
                  {showBalance ? formatCurrency(monthlyIncome) : "••••••"}
                </p>
              </div>

              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <TrendingDown className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-amber-900/80 font-medium">Despesas</span>
                </div>
                <p className="text-lg font-bold text-red-700">
                  {showBalance ? formatCurrency(monthlyExpenses) : "••••••"}
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mb-4"
          >
            <AccountsCollapsible showBalance={showBalance} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }}
            className="mb-4"
          >
            <CardsCollapsible showBalance={showBalance} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-4"
          >
            <button
              onClick={() => navigate("/invoices")}
              className="w-full bg-card rounded-2xl p-4 mb-3 shadow-sm border border-border flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-bold text-foreground">Pagar faturas</h2>
                  <p className="text-xs text-muted-foreground">Acesse e quite suas faturas de cartão</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>

            <button
              onClick={() => navigate("/transactions/history")}
              className="w-full bg-card rounded-2xl p-4 shadow-sm border border-border flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left">
                  <h2 className="text-base font-bold text-foreground">Histórico de transações</h2>
                  <p className="text-xs text-muted-foreground">Ver todas as movimentações</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </motion.div>
        </StateWrapper>
      </div>
    </MainLayout>
  );
}
