import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Clock,
  PartyPopper,
  Plus,
  Repeat,
  Rocket,
  Settings2,
  Sprout,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { ProgressRing } from "@/components/ProgressRing";
import { StateWrapper } from "@/components/StateWrapper";
import { useBudgets, getBudgetProgress, getBudgetStatus, formatCurrency } from "@/hooks/useBudgets";
import { useGoals, getDaysToDeadline, getGoalProgress } from "@/hooks/useGoals";
import { useRecurrences, formatCurrency as formatRecurrenceCurrency, getFrequencyLabel } from "@/hooks/useRecurrences";
import { getCategoryIcon } from "@/lib/icons";

type TabType = "budgets" | "goals" | "recurring";

interface EmptyPlanningStateProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

function EmptyPlanningState({ title, description, actionLabel, onAction }: EmptyPlanningStateProps) {
  return (
    <div className="bg-card rounded-2xl border border-border p-5 text-center">
      <h3 className="text-base font-bold text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 mb-4">{description}</p>
      <button
        onClick={onAction}
        className="w-full bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        {actionLabel}
      </button>
    </div>
  );
}

export function Planning() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const getInitialTab = (): TabType => {
    const tab = searchParams.get("tab");
    if (tab === "goals") return "goals";
    if (tab === "recurring") return "recurring";
    return "budgets";
  };

  const [activeTab, setActiveTab] = useState<TabType>(getInitialTab);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "goals") setActiveTab("goals");
    else if (tab === "recurring") setActiveTab("recurring");
    else if (tab === "budgets") setActiveTab("budgets");
  }, [searchParams]);

  const { data: budgets = [], isLoading: budgetsLoading, isError: budgetsError } = useBudgets();
  const { data: goals = [], isLoading: goalsLoading, isError: goalsError } = useGoals();
  const { data: recurrences = [], isLoading: recurrencesLoading, isError: recurrencesError } = useRecurrences();

  const isLoading =
    activeTab === "budgets" ? budgetsLoading : activeTab === "goals" ? goalsLoading : recurrencesLoading;

  const isError =
    activeTab === "budgets" ? budgetsError : activeTab === "goals" ? goalsError : recurrencesError;

  const activeBudgets = budgets.length;
  const activeGoals = goals.length;
  const activeRecurrences = recurrences.filter((item) => item.isActive).length;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "OVER":
        return { color: "text-destructive", bg: "bg-destructive", label: "Limite ultrapassado", icon: AlertTriangle };
      case "WARNING":
        return { color: "text-warning", bg: "bg-warning", label: "Quase no limite", icon: AlertCircle };
      default:
        return { color: "text-success", bg: "bg-success", label: "Dentro do planejado", icon: CheckCircle };
    }
  };

  const getGoalMotivation = (percentage: number, daysLeft: number | null) => {
    if (percentage >= 100) return { text: "Meta concluída", icon: PartyPopper };
    if (percentage >= 75) return { text: "Quase lá", icon: Zap };
    if (daysLeft !== null && daysLeft <= 7) return { text: `${daysLeft} dias restantes`, icon: Clock };
    if (percentage >= 50) return { text: "Bom progresso", icon: Rocket };
    return { text: "Continue evoluindo", icon: Sprout };
  };

  const getRecurrenceLabel = (isActive: boolean) => {
    return isActive ? "Ativo" : "Pausado";
  };

  const handleNewBudget = () => navigate("/planning/budget/new");
  const handleNewGoal = () => navigate("/planning/goal/new");
  const handleNewRecurrence = () => navigate("/planning/recurring/new");
  const handleBudgetClick = (budgetId: string) => navigate(`/planning/budget/${budgetId}`);
  const handleGoalClick = (goalId: string) => navigate(`/planning/goal/${goalId}`);
  const handleRecurrenceClick = (recurrenceId: string) => navigate(`/planning/recurring/${recurrenceId}`);

  return (
    <MainLayout>
      <div className="px-4 pt-4 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-5 mb-4 shadow-lg"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm text-amber-900/70 font-medium mb-0.5">Planejamento</p>
              <h1 className="text-xl font-black text-amber-950">Seu planejamento</h1>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-900" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
              <p className="text-xl font-black text-amber-950">{activeBudgets}</p>
              <p className="text-[10px] text-amber-900/70 font-semibold">Orçamentos</p>
            </div>
            <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
              <p className="text-xl font-black text-amber-950">{activeGoals}</p>
              <p className="text-[10px] text-amber-900/70 font-semibold">Metas</p>
            </div>
            <div className="bg-white/25 backdrop-blur-sm rounded-xl p-2.5 text-center">
              <p className="text-xl font-black text-amber-950">{activeRecurrences}</p>
              <p className="text-[10px] text-amber-900/70 font-semibold">Recorrentes</p>
            </div>
          </div>
        </motion.div>

        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.03 }}
          onClick={() => navigate("/categories")}
          className="w-full bg-card rounded-2xl p-3.5 mb-4 shadow-sm border border-border flex items-center justify-between hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Settings2 className="w-4.5 h-4.5 text-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-sm text-foreground">Categorias</p>
              <p className="text-[11px] text-muted-foreground">Gerencie e personalize</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-card rounded-2xl p-1.5 flex gap-1 mb-4 shadow-sm border border-border"
        >
          {[
            { id: "budgets" as const, label: "Orçamentos", icon: Target },
            { id: "goals" as const, label: "Metas", icon: TrendingUp },
            { id: "recurring" as const, label: "Recorrentes", icon: Repeat },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </motion.div>

        <StateWrapper isLoading={isLoading} isError={isError} isEmpty={false} loadingText="Carregando...">
          <AnimatePresence mode="wait">
            {activeTab === "budgets" && (
              <motion.div
                key="budgets"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {budgets.length === 0 && (
                  <EmptyPlanningState
                    title="Nenhum orçamento cadastrado"
                    description="Crie seu primeiro orçamento para controlar os limites de gasto."
                    actionLabel="Criar primeiro orçamento"
                    onAction={handleNewBudget}
                  />
                )}

                {budgets.map((budget, index) => {
                  const percentage = getBudgetProgress(budget);
                  const { status: statusCode } = getBudgetStatus(budget);
                  const statusStyle = getStatusStyle(statusCode);

                  return (
                    <motion.button
                      key={budget.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleBudgetClick(budget.id)}
                      className="w-full bg-card rounded-2xl p-4 text-left shadow-sm border border-border"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            {(() => {
                              const CategoryIcon = getCategoryIcon(budget.categoryIcon || budget.name);
                              return <CategoryIcon className="w-5 h-5 text-primary" />;
                            })()}
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm">{budget.name}</p>
                            <div className={`flex items-center gap-1 text-xs font-medium ${statusStyle.color}`}>
                              {(() => {
                                const StatusIcon = statusStyle.icon;
                                return <StatusIcon className="w-3 h-3" />;
                              })()}
                              <span>{statusStyle.label}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-foreground text-sm">{formatCurrency(budget.spent)}</p>
                          <p className="text-xs text-muted-foreground">de {formatCurrency(budget.amount)}</p>
                        </div>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(percentage, 100)}%` }}
                          className={`h-full ${statusStyle.bg} rounded-full`}
                        />
                      </div>
                    </motion.button>
                  );
                })}

                {budgets.length > 0 && (
                  <button
                    onClick={handleNewBudget}
                    className="w-full bg-card rounded-2xl p-4 shadow-sm border border-dashed border-primary/30 flex items-center justify-center gap-2 text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar orçamento
                  </button>
                )}
              </motion.div>
            )}

            {activeTab === "goals" && (
              <motion.div
                key="goals"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {goals.length === 0 && (
                  <EmptyPlanningState
                    title="Nenhuma meta cadastrada"
                    description="Crie sua primeira meta para acompanhar seu progresso."
                    actionLabel="Criar primeira meta"
                    onAction={handleNewGoal}
                  />
                )}

                {goals.map((goal, index) => {
                  const percentage = getGoalProgress(goal);
                  const daysLeft = getDaysToDeadline(goal);
                  const motivation = getGoalMotivation(percentage, daysLeft);

                  return (
                    <motion.button
                      key={goal.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleGoalClick(goal.id)}
                      className="w-full bg-card rounded-2xl p-4 text-left shadow-sm border border-border"
                    >
                      <div className="flex items-center gap-4">
                        <ProgressRing progress={percentage} size={56} strokeWidth={5} showPercentage />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-foreground text-sm">{goal.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(goal.currentAmount)} de {formatCurrency(goal.targetAmount)}
                          </p>
                          <div className="flex items-center gap-1 mt-1 text-xs font-medium text-primary">
                            {(() => {
                              const MotivationIcon = motivation.icon;
                              return <MotivationIcon className="w-3 h-3" />;
                            })()}
                            <span>{motivation.text}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </motion.button>
                  );
                })}

                {goals.length > 0 && (
                  <button
                    onClick={handleNewGoal}
                    className="w-full bg-card rounded-2xl p-4 shadow-sm border border-dashed border-primary/30 flex items-center justify-center gap-2 text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar meta
                  </button>
                )}
              </motion.div>
            )}

            {activeTab === "recurring" && (
              <motion.div
                key="recurring"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {recurrences.length === 0 && (
                  <EmptyPlanningState
                    title="Nenhuma recorrência cadastrada"
                    description="Adicione sua primeira transação recorrente para automatizar registros."
                    actionLabel="Criar primeira recorrência"
                    onAction={handleNewRecurrence}
                  />
                )}

                {recurrences.map((item, index) => (
                  <motion.button
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => handleRecurrenceClick(item.id)}
                    className="w-full bg-card rounded-2xl p-4 flex items-center justify-between text-left shadow-sm border border-border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          item.type === "RECEITA" ? "bg-success/15" : "bg-destructive/15"
                        }`}
                      >
                        <Repeat
                          className={`w-5 h-5 ${item.type === "RECEITA" ? "text-success" : "text-destructive"}`}
                        />
                      </div>
                      <div>
                        <p className="font-bold text-foreground text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getFrequencyLabel(item.frequency)} · {getRecurrenceLabel(item.isActive)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`font-bold text-sm ${
                          item.type === "RECEITA" ? "text-success" : "text-destructive"
                        }`}
                      >
                        {item.type === "RECEITA" ? "+" : "-"}
                        {formatRecurrenceCurrency(item.amount)}
                      </p>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </motion.button>
                ))}

                {recurrences.length > 0 && (
                  <button
                    onClick={handleNewRecurrence}
                    className="w-full bg-card rounded-2xl p-4 shadow-sm border border-dashed border-primary/30 flex items-center justify-center gap-2 text-primary font-bold text-sm hover:bg-primary/5 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Adicionar recorrência
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </StateWrapper>
      </div>
    </MainLayout>
  );
}
