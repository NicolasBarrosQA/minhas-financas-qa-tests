import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight,
  Search,
  Filter,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import { MainLayout } from "@/layouts/MainLayout";
import { TransactionItem } from "@/components/TransactionItem";
import { useTransactions } from "@/hooks/useTransactions";
import { format, subMonths, addMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Transaction } from "@/types/entities";
import { ManageTransactionDialog } from "@/components/ManageTransactionDialog";
import { parseLocalDate, toYmdLocal } from "@/lib/date";

// Mapeamento de nomes de ícones para categorias de transação
const ICON_TO_CATEGORY: Record<string, "shopping" | "food" | "transport" | "housing" | "entertainment" | "health" | "education" | "work" | "gift" | "utilities" | "other"> = {
  'compras': 'shopping',
  'alimentacao': 'food',
  'transporte': 'transport',
  'moradia': 'housing',
  'lazer': 'entertainment',
  'saude': 'health',
  'educacao': 'education',
  'trabalho': 'work',
  'presente': 'gift',
  'energia': 'utilities',
  'outros': 'other',
};

export function TransactionHistory() {
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense" | "transfer">("all");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  const monthStart = startOfMonth(selectedMonth);
  const monthEnd = endOfMonth(selectedMonth);

  const { data: transactionsData, isLoading } = useTransactions({
    startDate: toYmdLocal(monthStart),
    endDate: toYmdLocal(monthEnd),
  });

  const mapCategoryIcon = (icon?: string) => {
    return ICON_TO_CATEGORY[icon || ''] || 'other';
  };

  const transactions = transactionsData?.data ?? [];

  const filteredTransactions = transactions.filter(t => {
    const transactionDate = parseLocalDate(t.date);
    const isInMonth = transactionDate >= monthStart && transactionDate <= monthEnd;
    
    const matchesSearch = searchQuery === "" || 
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = filterType === "all" || 
      (filterType === "income" && t.type === "RECEITA") ||
      (filterType === "expense" && t.type === "DESPESA") ||
      (filterType === "transfer" && t.type === "TRANSFERENCIA");

    return isInMonth && matchesSearch && matchesType;
  });

  // Mapear para formato UI
  const mappedTransactions = filteredTransactions.map(t => ({
    id: t.id,
    title: t.description,
    category: mapCategoryIcon(t.category?.icon),
    amount: Number(t.amount),
    date: t.date,
    type:
      t.type === "RECEITA"
        ? ("income" as const)
        : t.type === "TRANSFERENCIA"
          ? ("transfer" as const)
          : ("expense" as const),
    raw: t,
  }));

  // Agrupar por data
  const groupedByDate = mappedTransactions.reduce((acc, t) => {
    const dateKey = format(parseLocalDate(t.date), "yyyy-MM-dd");
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(t);
    return acc;
  }, {} as Record<string, typeof mappedTransactions>);

  const sortedDates = Object.keys(groupedByDate).sort((a, b) => 
    parseLocalDate(b).getTime() - parseLocalDate(a).getTime()
  );

  // Calcular totais do mês
  const monthlyIncome = filteredTransactions
    .filter(t => t.type === "RECEITA")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const monthlyExpenses = filteredTransactions
    .filter(t => t.type === "DESPESA")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setSelectedMonth(prev => addMonths(prev, 1));
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-4 px-4 py-4">
            <button 
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm border border-border"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-xl font-bold text-foreground flex-1">Histórico</h1>
          </div>

          {/* Seletor de Mês */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between bg-card rounded-xl p-3 border border-border">
              <button 
                onClick={handlePreviousMonth}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              
              <span className="text-base font-semibold text-foreground capitalize">
                {format(selectedMonth, "MMMM yyyy", { locale: ptBR })}
              </span>
              
              <button 
                onClick={handleNextMonth}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </div>
        </div>

        {/* Resumo do Mês */}
        <div className="px-4 py-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-3 mb-4"
          >
            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                </div>
                <span className="text-xs text-muted-foreground">Entradas</span>
              </div>
              <p className="text-lg font-bold text-emerald-500">{formatCurrency(monthlyIncome)}</p>
            </div>

            <div className="bg-card rounded-xl p-4 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                </div>
                <span className="text-xs text-muted-foreground">Saídas</span>
              </div>
              <p className="text-lg font-bold text-destructive">{formatCurrency(monthlyExpenses)}</p>
            </div>
          </motion.div>

          {/* Busca e Filtros */}
          <div className="flex gap-2 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar transação..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
          </div>

          {/* Filtro por tipo */}
          <div className="flex gap-2 mb-4">
            {[
              { value: "all", label: "Todas" },
              { value: "income", label: "Entradas" },
              { value: "expense", label: "Saídas" },
              { value: "transfer", label: "Transferencias" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setFilterType(option.value as typeof filterType)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterType === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-card border border-border text-foreground hover:bg-muted"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Lista de Transações agrupadas por data */}
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-24 mb-2" />
                  <div className="bg-card rounded-xl p-4 space-y-3">
                    <div className="h-12 bg-muted rounded" />
                    <div className="h-12 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : sortedDates.length > 0 ? (
            <div className="space-y-4 pb-8">
              {sortedDates.map((dateKey, groupIndex) => (
                <motion.div
                  key={dateKey}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: groupIndex * 0.05 }}
                >
                  <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                    {format(parseLocalDate(dateKey), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="bg-card rounded-xl divide-y divide-border border border-border">
                    {groupedByDate[dateKey].map((transaction, index) => (
                      <motion.div
                        key={transaction.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: groupIndex * 0.05 + index * 0.02 }}
                      >
                        <TransactionItem
                          {...transaction}
                          onClick={() => setSelectedTransaction(transaction.raw)}
                        />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Filter className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">Nenhuma transação</h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery 
                  ? "Nenhuma transação encontrada com esses filtros"
                  : "Nenhuma transação registrada neste mês"
                }
              </p>
            </div>
          )}
        </div>
      </div>

      <ManageTransactionDialog
        open={!!selectedTransaction}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />
    </MainLayout>
  );
}
