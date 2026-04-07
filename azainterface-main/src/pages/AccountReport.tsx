import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  BarChart3,
  Search,
  Calendar,
  Zap,
  Pencil,
  Check,
  X,
  Archive,
  Plus,
  ArrowLeftRight
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useAccount, useUpdateAccount, useArchiveAccount, ACCOUNT_TYPE_LABELS, ACCOUNT_TYPE_ICONS, INSTITUTIONS } from "@/hooks/useAccounts";
import { formatCurrency } from "@/hooks/useDashboard";
import { getCategoryIcon } from "@/lib/icons";
import { useState, useMemo } from "react";
import { BankLogo } from "@/components/BankLogo";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TransactionModal, TransactionType } from "@/components/TransactionModal";
import { useTransactions } from "@/hooks/useTransactions";
import type { Transaction } from "@/types/entities";
import { ManageTransactionDialog } from "@/components/ManageTransactionDialog";
import { parseLocalDate } from "@/lib/date";

type AccountTransactionView = {
  id: string;
  description: string;
  category: { name: string; icon: string; color: string };
  amount: number;
  date: string;
  type: 'RECEITA' | 'DESPESA' | 'TRANSFERENCIA';
  raw: Transaction;
};

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function AccountReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'reports'>('transactions');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editInstitution, setEditInstitution] = useState('');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  // Transaction modal state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const nowDay = now.getDate();
  const maxFutureMonthDate = new Date(nowYear, nowMonth + 12, 1);
  const [selectedMonth, setSelectedMonth] = useState(nowMonth);
  const [selectedYear, setSelectedYear] = useState(nowYear);
  
  const { data: account, isLoading } = useAccount(id || '');
  const updateAccount = useUpdateAccount();
  const archiveAccount = useArchiveAccount();
  const { data: transactionsData } = useTransactions({ accountId: id });

  const openTransaction = (type: TransactionType) => {
    setTransactionType(type);
    setIsTransactionModalOpen(true);
  };

  const handleArchiveAccount = () => {
    if (!id) return;
    archiveAccount.mutate(id, {
      onSuccess: () => {
        navigate('/home', { replace: true });
      }
    });
  };

  const handleStartEdit = () => {
    if (account) {
      setEditName(account.name);
      setEditInstitution(account.institution || '');
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName('');
    setEditInstitution('');
  };

  const handleSaveEdit = () => {
    if (account && editName.trim()) {
      updateAccount.mutate({
        id: account.id,
        data: {
          name: editName.trim(),
          institution: editInstitution || undefined,
        },
      }, {
        onSuccess: () => {
          setIsEditing(false);
        }
      });
    }
  };
  const normalizedTransactions = useMemo<AccountTransactionView[]>(() => {
    const raw = transactionsData?.data ?? [];
    return raw.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: Number(tx.amount),
      date: tx.date,
      type: tx.type,
      raw: tx,
      category: {
        name: tx.category?.name || 'Outros',
        icon: tx.category?.icon || 'outros',
        color: tx.category?.color || '#6B7280',
      },
    }));
  }, [transactionsData]);

  const filteredTransactions = useMemo(() => {
    return normalizedTransactions.filter((t) => {
      const d = parseLocalDate(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [normalizedTransactions, selectedMonth, selectedYear]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, typeof filteredTransactions> = {};
    filteredTransactions.forEach((t) => {
      const dateKey = t.date;
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(t);
    });

    return Object.entries(groups).sort((a, b) => parseLocalDate(b[0]).getTime() - parseLocalDate(a[0]).getTime());
  }, [filteredTransactions]);

  const monthTotals = useMemo(() => {
    const income = filteredTransactions.filter((t) => t.type === 'RECEITA').reduce((sum, t) => sum + t.amount, 0);
    const expenses = filteredTransactions.filter((t) => t.type === 'DESPESA').reduce((sum, t) => sum + t.amount, 0);
    return { income, expenses, balance: income - expenses };
  }, [filteredTransactions]);

  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, { name: string; icon: string; color: string; total: number }> = {};
    filteredTransactions
      .filter((t) => t.type === 'DESPESA')
      .forEach((t) => {
        if (!categories[t.category.name]) categories[t.category.name] = { ...t.category, total: 0 };
        categories[t.category.name].total += t.amount;
      });

    return Object.values(categories).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const previousMonthExpenses = useMemo(() => {
    const prev = new Date(selectedYear, selectedMonth - 1, 1);
    return normalizedTransactions
      .filter((t) => {
        if (t.type !== 'DESPESA') return false;
        const d = parseLocalDate(t.date);
        return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [normalizedTransactions, selectedMonth, selectedYear]);

  const insights = useMemo(() => {
    const currentMonthAnchor = new Date(nowYear, nowMonth, 1);
    const selectedMonthAnchor = new Date(selectedYear, selectedMonth, 1);
    const isPastMonth = selectedMonthAnchor < currentMonthAnchor;
    const isFutureMonth = selectedMonthAnchor > currentMonthAnchor;
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const daysPassed = isPastMonth ? daysInMonth : isFutureMonth ? 0 : nowDay;
    const daysRemaining = Math.max(0, daysInMonth - daysPassed);

    const divisor = isFutureMonth ? daysInMonth : Math.max(1, daysPassed);
    const dailyAverage = monthTotals.expenses / divisor;
    const projectedExpenses = isPastMonth || isFutureMonth ? monthTotals.expenses : dailyAverage * daysInMonth;
    const expenseChange =
      previousMonthExpenses > 0 ? ((monthTotals.expenses - previousMonthExpenses) / previousMonthExpenses) * 100 : 0;

    const biggestCategory = categoryBreakdown[0];

    return {
      dailyAverage,
      projectedExpenses,
      expenseChange,
      daysRemaining,
      daysPassed,
      biggestCategory,
    };
  }, [monthTotals.expenses, previousMonthExpenses, categoryBreakdown, nowDay, nowMonth, nowYear, selectedMonth, selectedYear]);

  // Gráfico de pizza
  const pieSlices = useMemo(() => {
    if (monthTotals.expenses === 0) return [];
    let cumulativePercentage = 0;
    return categoryBreakdown.map(cat => {
      const percentage = (cat.total / monthTotals.expenses) * 100;
      const startAngle = cumulativePercentage * 3.6;
      cumulativePercentage += percentage;
      const endAngle = cumulativePercentage * 3.6;
      return { ...cat, percentage, startAngle, endAngle };
    });
  }, [categoryBreakdown, monthTotals.expenses]);

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

  const goToPreviousMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(selectedYear - 1); }
    else { setSelectedMonth(selectedMonth - 1); }
  };

  const goToNextMonth = () => {
    const isAtMaxMonth =
      selectedYear > maxFutureMonthDate.getFullYear() ||
      (selectedYear === maxFutureMonthDate.getFullYear() && selectedMonth >= maxFutureMonthDate.getMonth());
    if (isAtMaxMonth) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(selectedYear + 1); }
    else { setSelectedMonth(selectedMonth + 1); }
  };

  const formatTransactionDate = (dateString: string) => {
    const date = parseLocalDate(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Hoje';
    if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };

  const isAtMaxMonth =
    selectedYear > maxFutureMonthDate.getFullYear() ||
    (selectedYear === maxFutureMonthDate.getFullYear() && selectedMonth >= maxFutureMonthDate.getMonth());

  if (isLoading) {
    return (
      <MainLayout hideNav>
        <div className="flex items-center justify-center h-screen bg-background">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full" />
        </div>
      </MainLayout>
    );
  }

  if (!account) {
    return (
      <MainLayout hideNav>
        <div className="flex flex-col items-center justify-center h-screen bg-background p-6 text-center">
          <Search className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">Conta não encontrada</p>
          <p className="text-sm text-muted-foreground mb-6">Parece que essa conta não existe mais.</p>
          <button onClick={() => navigate(-1)} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold">Voltar</button>
        </div>
      </MainLayout>
    );
  }

  const typeLabel = ACCOUNT_TYPE_LABELS[account.type];
  const AccountIcon = ACCOUNT_TYPE_ICONS[account.type];

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background pb-6">
        <div className="px-4 pt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm border border-border active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-base font-bold text-foreground">Detalhes da Conta</h1>
            <div className="w-10" />
          </div>

          {/* Card Protagonista Dourado */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-5 mb-4 shadow-lg"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center">
                <BankLogo institution={account.institution} fallbackIcon={AccountIcon} size="sm" />
              </div>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Nome da conta"
                      className="h-8 text-sm font-bold bg-white/50 border-white/50 text-amber-950 placeholder:text-amber-900/50"
                    />
                    <Select value={editInstitution} onValueChange={setEditInstitution}>
                      <SelectTrigger className="h-8 text-xs bg-white/50 border-white/50 text-amber-900">
                        <SelectValue placeholder="Selecione a instituição" />
                      </SelectTrigger>
                      <SelectContent>
                        {INSTITUTIONS.map((inst) => (
                          <SelectItem key={inst} value={inst}>{inst}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <>
                    <h2 className="text-lg font-black text-amber-950">{account.name}</h2>
                    <p className="text-xs text-amber-900/70">{typeLabel} {account.institution && `• ${account.institution}`}</p>
                  </>
                )}
              </div>
              {/* Botão de edição */}
              {isEditing ? (
                <div className="flex gap-1">
                  <button 
                    onClick={handleSaveEdit}
                    disabled={updateAccount.isPending}
                    className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  <button 
                    onClick={handleCancelEdit}
                    className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <X className="w-4 h-4 text-amber-900" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={handleStartEdit}
                  className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center active:scale-95 transition-transform"
                >
                  <Pencil className="w-4 h-4 text-amber-900" />
                </button>
              )}
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-amber-900/70 font-medium mb-1">Saldo disponível</p>
                <motion.p key={showBalance ? "visible" : "hidden"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-black text-amber-950">
                  {showBalance ? formatCurrency(account.balance) : "R$ ••••••"}
                </motion.p>
              </div>
              <button onClick={() => setShowBalance(!showBalance)} className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform">
                {showBalance ? <Eye className="w-5 h-5 text-amber-900" /> : <EyeOff className="w-5 h-5 text-amber-900" />}
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
                <p className="text-lg font-bold text-emerald-700">{showBalance ? formatCurrency(monthTotals.income) : "••••••"}</p>
              </div>
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <TrendingDown className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-xs text-amber-900/80 font-medium">Saídas</span>
                </div>
                <p className="text-lg font-bold text-red-700">{showBalance ? formatCurrency(monthTotals.expenses) : "••••••"}</p>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex gap-2 mb-4"
          >
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={() => openTransaction('expense')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Transação
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={() => openTransaction('transfer')}
            >
              <ArrowLeftRight className="w-4 h-4 mr-2" />
              Transferir
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
              onClick={() => setShowArchiveDialog(true)}
            >
              <Archive className="w-4 h-4" />
            </Button>
          </motion.div>

          {/* Month Selector */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mb-4">
            <div className="bg-card rounded-2xl p-3 shadow-sm border border-border flex items-center justify-between">
              <button onClick={goToPreviousMonth} className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center active:scale-95 transition-transform">
                <ChevronLeft className="w-5 h-5 text-foreground" />
              </button>
              <div className="text-center flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-base font-bold text-foreground">{MONTHS[selectedMonth]}</p>
                  <p className="text-xs text-muted-foreground">{selectedYear}</p>
                </div>
              </div>
              <button onClick={goToNextMonth} disabled={isAtMaxMonth} className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all ${isAtMaxMonth ? 'bg-muted/20 opacity-40' : 'bg-muted/50'}`}>
                <ChevronRight className="w-5 h-5 text-foreground" />
              </button>
            </div>
          </motion.div>

          {/* Tab Switcher */}
          <div className="mb-4">
            <div className="bg-muted/50 rounded-xl p-1 flex gap-1">
              <button
                onClick={() => setActiveTab('transactions')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'transactions' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <Receipt className="w-4 h-4" />
                Transações
              </button>
              <button
                onClick={() => setActiveTab('reports')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'reports' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}
              >
                <BarChart3 className="w-4 h-4" />
                Relatórios
              </button>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'transactions' ? (
            <motion.div key="transactions" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="px-4">
              {/* Transactions List Header */}
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Movimentações</h2>
                <span className="text-xs text-muted-foreground">({filteredTransactions.length})</span>
              </div>

              <AnimatePresence mode="wait">
                {groupedTransactions.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-card rounded-2xl p-8 text-center border border-border">
                    <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground mb-1">Nenhuma transação</p>
                    <p className="text-xs text-muted-foreground">Não encontramos movimentações em {MONTHS[selectedMonth].toLowerCase()}.</p>
                  </motion.div>
                ) : (
                  <motion.div key={`${selectedMonth}-${selectedYear}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                    {groupedTransactions.map(([date, transactions], groupIndex) => (
                      <div key={date}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{formatTransactionDate(date)}</span>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="bg-card rounded-2xl overflow-hidden border border-border shadow-sm">
                          {transactions.map((transaction, index) => {
                            const CategoryIcon = getCategoryIcon(transaction.category.icon);
                            return (
                              <motion.div
                                key={transaction.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.03 * (groupIndex + index) }}
                                onClick={() => setSelectedTransaction(transaction.raw)}
                                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors ${index !== transactions.length - 1 ? 'border-b border-border/50' : ''}`}
                              >
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${transaction.category.color}20` }}>
                                  <CategoryIcon className="w-5 h-5" style={{ color: transaction.category.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{transaction.description}</p>
                                  <p className="text-xs text-muted-foreground">{transaction.category.name}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className={`text-sm font-bold ${transaction.type === 'RECEITA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                                    {showBalance ? (<>{transaction.type === 'RECEITA' ? '+' : '-'}{formatCurrency(transaction.amount)}</>) : "••••"}
                                  </p>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div key="reports" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="px-4 space-y-4">
              
              {/* Gráfico de Pizza + Categorias */}
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Para onde foi seu dinheiro</h2>
                </div>

                {pieSlices.length === 0 ? (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">Nenhuma despesa no período</p>
                  </div>
                ) : (
                  <div className="flex gap-4">
                    {/* Pie Chart */}
                    <div className="flex-shrink-0">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        {pieSlices.map((slice, index) => createPieSlice(slice.startAngle, slice.endAngle, slice.color, index))}
                        <circle cx="60" cy="60" r="25" className="fill-card" />
                        <text x="60" y="56" textAnchor="middle" className="fill-foreground text-xs font-bold">Total</text>
                        <text x="60" y="70" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                          {showBalance ? `R$${(monthTotals.expenses/1000).toFixed(1)}k` : "•••"}
                        </text>
                      </svg>
                    </div>

                    {/* Legenda */}
                    <div className="flex-1 space-y-1.5">
                      {pieSlices.map((cat, index) => (
                        <motion.div key={cat.name} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + index * 0.05 }} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="text-xs text-foreground truncate flex-1">{cat.name}</span>
                          <span className="text-xs font-medium text-muted-foreground">{cat.percentage.toFixed(0)}%</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Comparativo com Mês Anterior */}
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">vs. Mês Anterior</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Você gastou</p>
                    <p className="text-xl font-bold text-foreground">{showBalance ? formatCurrency(monthTotals.expenses) : "••••••"}</p>
                  </div>
                  <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${insights.expenseChange <= 0 ? 'bg-emerald-500/10' : 'bg-destructive/10'}`}>
                    {insights.expenseChange <= 0 ? (
                      <ArrowDownRight className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-destructive" />
                    )}
                    <span className={`text-sm font-bold ${insights.expenseChange <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
                      {Math.abs(insights.expenseChange).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {insights.expenseChange <= 0 
                    ? `Gastando ${Math.abs(insights.expenseChange).toFixed(0)}% a menos que no mês passado`
                    : `Gastando ${insights.expenseChange.toFixed(0)}% a mais que no mês passado`
                  }
                </p>
              </div>

              {/* Projeção e Média Diária */}
              <div className="grid grid-cols-2 gap-3">
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-primary/10 rounded-2xl p-4 border border-primary/20">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Projeção Mensal</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{showBalance ? formatCurrency(insights.projectedExpenses) : "••••••"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">se mantiver o ritmo</p>
                </motion.div>
                
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-secondary/30 rounded-2xl p-4 border border-secondary/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <TrendingDown className="w-4 h-4 text-secondary-foreground" />
                    <span className="text-xs text-muted-foreground">Média Diária</span>
                  </div>
                  <p className="text-xl font-bold text-foreground">{showBalance ? formatCurrency(insights.dailyAverage) : "••••••"}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{insights.daysRemaining} dias restantes</p>
                </motion.div>
              </div>

              {/* Maior Gasto */}
              {insights.biggestCategory && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${insights.biggestCategory.color}20` }}>
                      {(() => {
                        const Icon = getCategoryIcon(insights.biggestCategory.icon);
                        return <Icon className="w-6 h-6" style={{ color: insights.biggestCategory.color }} />;
                      })()}
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-muted-foreground">Onde você mais gastou</p>
                      <p className="text-base font-bold text-foreground">{insights.biggestCategory.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{showBalance ? formatCurrency(insights.biggestCategory.total) : "••••"}</p>
                      <p className="text-xs text-muted-foreground">
                        {((insights.biggestCategory.total / monthTotals.expenses) * 100).toFixed(0)}% do total
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        initialType={transactionType}
        accountId={id}
      />

      <ManageTransactionDialog
        open={!!selectedTransaction}
        onOpenChange={(open) => {
          if (!open) setSelectedTransaction(null);
        }}
        transaction={selectedTransaction}
      />

      {/* Archive Confirmation Dialog */}
      <AlertDialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arquivar conta?</AlertDialogTitle>
            <AlertDialogDescription>
              A conta "{account?.name}" será arquivada e não aparecerá mais na tela inicial. Você pode restaurá-la a qualquer momento na seção de arquivados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveAccount}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              Arquivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}





