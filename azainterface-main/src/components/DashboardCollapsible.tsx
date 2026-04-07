import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Zap,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { formatCurrency } from "@/hooks/useDashboard";
import { useTransactions } from "@/hooks/useTransactions";
import { getCategoryIcon } from "@/lib/icons";

interface CategoryExpense {
  name: string;
  value: number;
  color: string;
  icon: string;
}

interface DashboardCollapsibleProps {
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  showBalance: boolean;
}

export function DashboardCollapsible({
  monthlyIncome,
  monthlyExpenses,
  showBalance,
}: DashboardCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: transactionsData } = useTransactions({ limit: 1000 });

  const transactions = useMemo(() => transactionsData?.data ?? [], [transactionsData]);
  const today = useMemo(() => new Date(), []);

  const categories = useMemo<CategoryExpense[]>(() => {
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const map = new Map<string, CategoryExpense>();

    transactions.forEach((tx) => {
      if (tx.type !== "DESPESA") return;

      const txDate = new Date(tx.date);
      if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) return;

      const key = tx.categoryId || tx.category?.name || "outros";
      const existing = map.get(key) || {
        name: tx.category?.name || "Outros",
        value: 0,
        color: tx.category?.color || "#6b7280",
        icon: tx.category?.icon || "outros",
      };

      existing.value += Number(tx.amount);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [transactions, today]);

  const totalExpenses = categories.reduce((sum, cat) => sum + cat.value, 0);

  const previousMonthTotals = useMemo(() => {
    const previousRef = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const month = previousRef.getMonth();
    const year = previousRef.getFullYear();

    return transactions.reduce(
      (acc, tx) => {
        const txDate = new Date(tx.date);
        if (txDate.getMonth() !== month || txDate.getFullYear() !== year) return acc;

        if (tx.type === "RECEITA") acc.income += Number(tx.amount);
        if (tx.type === "DESPESA") acc.expenses += Number(tx.amount);
        return acc;
      },
      { income: 0, expenses: 0 },
    );
  }, [transactions, today]);

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysPassed = Math.max(1, today.getDate());
  const daysRemaining = daysInMonth - today.getDate();

  const dailyAverage = monthlyExpenses / daysPassed;
  const projectedExpenses = dailyAverage * daysInMonth;

  const expenseChange =
    previousMonthTotals.expenses > 0
      ? ((monthlyExpenses - previousMonthTotals.expenses) / previousMonthTotals.expenses) * 100
      : 0;

  const incomeChange =
    previousMonthTotals.income > 0
      ? ((monthlyIncome - previousMonthTotals.income) / previousMonthTotals.income) * 100
      : 0;

  let cumulativePercentage = 0;
  const pieSlices = categories.map((cat) => {
    const percentage = totalExpenses > 0 ? (cat.value / totalExpenses) * 100 : 0;
    const startAngle = cumulativePercentage * 3.6;
    cumulativePercentage += percentage;
    const endAngle = cumulativePercentage * 3.6;
    return { ...cat, percentage, startAngle, endAngle };
  });

  const createPieSlice = (startAngle: number, endAngle: number, color: string, index: number) => {
    const radius = 50;
    const centerX = 60;
    const centerY = 60;

    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);

    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    const d = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

    return (
      <motion.path
        key={index}
        d={d}
        fill={color}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 + index * 0.08, duration: 0.3 }}
      />
    );
  };

  const biggestCategory = categories[0];

  const renderCategoryIcon = (iconName: string, color: string) => {
    const Icon = getCategoryIcon(iconName);
    return <Icon className="w-5 h-5" style={{ color }} />;
  };

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Insights do Mes</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    {pieSlices.map((slice, index) =>
                      createPieSlice(slice.startAngle, slice.endAngle, slice.color, index),
                    )}
                    <circle cx="60" cy="60" r="25" className="fill-card" />
                    <text x="60" y="56" textAnchor="middle" className="fill-foreground text-xs font-bold">
                      Total
                    </text>
                    <text x="60" y="70" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                      {showBalance ? `R$${(totalExpenses / 1000).toFixed(1)}k` : "•••"}
                    </text>
                  </svg>
                </div>

                <div className="flex-1 space-y-1.5">
                  {pieSlices.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem despesas no mes atual.</p>
                  ) : (
                    pieSlices.map((cat, index) => (
                      <motion.div
                        key={cat.name}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 + index * 0.05 }}
                        className="flex items-center gap-2"
                      >
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="text-xs text-foreground truncate flex-1">{cat.name}</span>
                        <span className="text-xs font-medium text-muted-foreground">{cat.percentage.toFixed(0)}%</span>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-muted/50 rounded-xl p-3">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">vs. Mes Anterior</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Receitas</span>
                    <div className={`flex items-center gap-1 text-xs font-medium ${incomeChange >= 0 ? "text-success" : "text-destructive"}`}>
                      {incomeChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(incomeChange).toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Despesas</span>
                    <div className={`flex items-center gap-1 text-xs font-medium ${expenseChange <= 0 ? "text-success" : "text-destructive"}`}>
                      {expenseChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(expenseChange).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-primary/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs text-muted-foreground">Projecao Mensal</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {showBalance ? formatCurrency(projectedExpenses) : "••••••"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">se mantiver o ritmo atual</p>
                </div>

                <div className="bg-secondary/50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingDown className="w-3.5 h-3.5 text-secondary-foreground" />
                    <span className="text-xs text-muted-foreground">Media Diaria</span>
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {showBalance ? formatCurrency(dailyAverage) : "••••••"}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{daysRemaining} dias restantes</p>
                </div>
              </div>

              {biggestCategory && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center gap-3 bg-destructive/10 rounded-xl p-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${biggestCategory.color}20` }}
                  >
                    {renderCategoryIcon(biggestCategory.icon, biggestCategory.color)}
                  </div>
                  <div className="flex-1">
                    <span className="text-xs text-muted-foreground">Maior categoria de gasto</span>
                    <p className="text-sm font-semibold text-foreground">{biggestCategory.name}</p>
                  </div>
                  <span className="text-sm font-bold text-destructive">
                    {showBalance ? formatCurrency(biggestCategory.value) : "••••••"}
                  </span>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

