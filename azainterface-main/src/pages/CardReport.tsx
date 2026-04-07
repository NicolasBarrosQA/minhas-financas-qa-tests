import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Receipt,
  BarChart3,
  Search,
  Calendar,
  CreditCard,
  Clock,
  TrendingUp,
  Zap,
  CheckCircle,
  AlertTriangle,
  Pencil,
  Check,
  X,
  Archive,
  Plus
} from "lucide-react";
import { useParams, useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useCard, useUpdateCard, useArchiveCard, getCardLimitStatus } from "@/hooks/useCards";
import { formatCurrency } from "@/hooks/useDashboard";
import { getCategoryIcon } from "@/lib/icons";
import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { TransactionModal } from "@/components/TransactionModal";
import { useTransactions } from "@/hooks/useTransactions";
import { useInvoices } from "@/hooks/useInvoices";
import type { Transaction } from "@/types/entities";
import { ManageTransactionDialog } from "@/components/ManageTransactionDialog";
import { parseLocalDate } from "@/lib/date";

type CardTransactionView = {
  id: string;
  description: string;
  category: { name: string; icon: string; color: string };
  amount: number;
  date: string;
  installment: { current: number; total: number } | null;
  raw: Transaction;
};

type InstallmentSummary = {
  id: string;
  description: string;
  totalAmount: number;
  monthlyAmount: number;
  seriesId?: string;
  current: number;
  total: number;
  remaining: number;
};

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export function CardReport() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<'transactions' | 'reports'>('transactions');
  const [isEditingLimit, setIsEditingLimit] = useState(false);
  const [editLimit, setEditLimit] = useState('');
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  
  // Transaction modal state
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  
  const now = new Date();
  const nowYear = now.getFullYear();
  const nowMonth = now.getMonth();
  const maxFutureMonthDate = new Date(nowYear, nowMonth + 12, 1);
  const [selectedMonth, setSelectedMonth] = useState(nowMonth);
  const [selectedYear, setSelectedYear] = useState(nowYear);
  
  const { data: card, isLoading } = useCard(id || '');
  const updateCard = useUpdateCard();
  const archiveCard = useArchiveCard();
  const { data: transactionsData } = useTransactions({ cardId: id });
  const { data: invoicesData = [] } = useInvoices(id);

  const handleArchiveCard = () => {
    if (!id) return;
    archiveCard.mutate(id, {
      onSuccess: () => {
        navigate('/home', { replace: true });
      }
    });
  };

  const handleStartEditLimit = () => {
    if (card) {
      setEditLimit(String(card.limit));
      setIsEditingLimit(true);
    }
  };

  const handleCancelEditLimit = () => {
    setIsEditingLimit(false);
    setEditLimit('');
  };

  const handleSaveLimit = () => {
    const newLimit = parseFloat(editLimit);
    if (card && !isNaN(newLimit) && newLimit > 0) {
      updateCard.mutate({
        id: card.id,
        data: {
          limit: newLimit,
        },
      }, {
        onSuccess: () => {
          setIsEditingLimit(false);
        }
      });
    }
  };

  const normalizedTransactions = useMemo<CardTransactionView[]>(() => {
    const raw = transactionsData?.data ?? [];
    return raw.map((tx) => ({
      id: tx.id,
      description: tx.description,
      amount: Number(tx.amount),
      date: tx.date,
      raw: tx,
      category: {
        name: tx.category?.name || 'Outros',
        icon: tx.category?.icon || 'outros',
        color: tx.category?.color || '#6B7280',
      },
      installment:
        (tx.totalInstallments || 0) > 1
          ? {
              current: tx.installmentNumber || 1,
              total: tx.totalInstallments || 1,
            }
          : null,
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
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    return Object.entries(groups).sort((a, b) => parseLocalDate(b[0]).getTime() - parseLocalDate(a[0]).getTime());
  }, [filteredTransactions]);

  const invoiceTotal = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
  }, [filteredTransactions]);

  const selectedInvoice = useMemo(() => {
    return (
      invoicesData.find((invoice) => invoice.month === selectedMonth + 1 && invoice.year === selectedYear) || null
    );
  }, [invoicesData, selectedMonth, selectedYear]);

  const selectedInvoiceAmount = useMemo(() => {
    if (selectedInvoice) {
      return Math.max(0, Number((selectedInvoice.closingBalance - selectedInvoice.paidAmount).toFixed(2)));
    }
    return invoiceTotal;
  }, [selectedInvoice, invoiceTotal]);

  const categoryBreakdown = useMemo(() => {
    const categories: Record<string, { name: string; icon: string; color: string; total: number }> = {};
    filteredTransactions.forEach((t) => {
      if (!categories[t.category.name]) categories[t.category.name] = { ...t.category, total: 0 };
      categories[t.category.name].total += t.amount;
    });
    return Object.values(categories).sort((a, b) => b.total - a.total);
  }, [filteredTransactions]);

  const installmentSummaries = useMemo<InstallmentSummary[]>(() => {
    const endOfSelectedMonth = new Date(selectedYear, selectedMonth + 1, 0);
    const groups = new Map<string, InstallmentSummary>();

    normalizedTransactions
      .filter((tx) => tx.installment)
      .forEach((tx) => {
        const installment = tx.installment!;
        const txDate = parseLocalDate(tx.date);
        const fallbackKey = `${tx.description}-${installment.total}-${tx.amount.toFixed(2)}-${txDate.getFullYear()}-${txDate.getMonth()}`;
        const key = tx.raw.installmentSeriesId || fallbackKey;

        const existing = groups.get(key) || {
          id: key,
          seriesId: tx.raw.installmentSeriesId,
          description: tx.description,
          totalAmount: Number((tx.amount * installment.total).toFixed(2)),
          monthlyAmount: tx.amount,
          current: 0,
          total: installment.total,
          remaining: installment.total,
        };

        if (parseLocalDate(tx.date) <= endOfSelectedMonth) {
          existing.current = Math.max(existing.current, installment.current);
          existing.remaining = Math.max(0, existing.total - existing.current);
        }

        groups.set(key, existing);
      });

    return Array.from(groups.values()).filter((item) => item.remaining > 0);
  }, [normalizedTransactions, selectedMonth, selectedYear]);

  const invoicesHistory = useMemo(() => {
    return [...invoicesData]
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      })
      .slice(0, 6)
      .map((inv) => ({
        month: MONTHS[Math.max(0, inv.month - 1)].slice(0, 3),
        year: inv.year,
        total: inv.closingBalance,
        status: inv.status,
      }));
  }, [invoicesData]);

  const pieSlices = useMemo(() => {
    if (invoiceTotal === 0) return [];
    let cumulativePercentage = 0;
    return categoryBreakdown.map((cat) => {
      const percentage = (cat.total / invoiceTotal) * 100;
      const startAngle = cumulativePercentage * 3.6;
      cumulativePercentage += percentage;
      return { ...cat, percentage, startAngle, endAngle: cumulativePercentage * 3.6 };
    });
  }, [categoryBreakdown, invoiceTotal]);

  const createPieSlice = (startAngle: number, endAngle: number, color: string, index: number) => {
    const radius = 50, centerX = 60, centerY = 60;
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);
    const x1 = centerX + radius * Math.cos(startRad);
    const y1 = centerY + radius * Math.sin(startRad);
    const x2 = centerX + radius * Math.cos(endRad);
    const y2 = centerY + radius * Math.sin(endRad);
    const largeArcFlag = endAngle - startAngle > 180 ? 1 : 0;
    
    return (
      <motion.path key={index} d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`} fill={color}
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 + index * 0.08, duration: 0.3 }} />
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

  if (!card) {
    return (
      <MainLayout hideNav>
        <div className="flex flex-col items-center justify-center h-screen bg-background p-6 text-center">
          <Search className="w-16 h-16 text-muted-foreground mb-4" />
          <p className="text-lg font-semibold text-foreground mb-2">Cartão não encontrado</p>
          <p className="text-sm text-muted-foreground mb-6">Parece que esse cartão não existe mais.</p>
          <button onClick={() => navigate(-1)} className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold">Voltar</button>
        </div>
      </MainLayout>
    );
  }

  const usagePercent = card.limit > 0 ? (selectedInvoiceAmount / card.limit) * 100 : 0;
  const status = getCardLimitStatus({
    ...card,
    currentSpend: selectedInvoiceAmount,
  });
  const totalInstallmentsMonthly = installmentSummaries.reduce((sum, i) => sum + i.monthlyAmount, 0);
  const dueLabel = selectedInvoice
    ? parseLocalDate(selectedInvoice.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    : `Dia ${card.dueDay}`;

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background pb-6">
        <div className="px-4 pt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm border border-border active:scale-95 transition-transform">
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <h1 className="text-base font-bold text-foreground">Detalhes do Cartão</h1>
            <div className="w-10" />
          </div>

          {/* Card Protagonista Dourado */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 rounded-2xl p-5 mb-4 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-white/30 backdrop-blur-sm flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-amber-900" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-black text-amber-950">{card.name}</h2>
                <p className="text-xs text-amber-900/70">{card.brand} •••• {card.lastFourDigits}</p>
              </div>
            </div>

            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm text-amber-900/70 font-medium mb-1">Fatura Atual</p>
                <motion.p key={showBalance ? "visible" : "hidden"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-black text-amber-950">
                  {showBalance ? formatCurrency(selectedInvoiceAmount) : "R$ ••••••"}
                </motion.p>
              </div>
              <button onClick={() => setShowBalance(!showBalance)} className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform">
                {showBalance ? <Eye className="w-5 h-5 text-amber-900" /> : <EyeOff className="w-5 h-5 text-amber-900" />}
              </button>
            </div>

            {/* Barra de limite com opção de edição */}
            <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3 mb-3">
              <div className="flex items-center justify-between text-xs mb-2">
                <div className="flex items-center gap-2">
                <span className="text-amber-900/80 font-medium">{usagePercent.toFixed(0)}% do limite usado</span>
                  {!isEditingLimit && (
                    <button 
                      onClick={handleStartEditLimit}
                      className="w-5 h-5 rounded-full bg-white/30 flex items-center justify-center active:scale-95 transition-transform"
                    >
                      <Pencil className="w-3 h-3 text-amber-900" />
                    </button>
                  )}
                </div>
                <span className="text-amber-900/70">
                  {showBalance ? formatCurrency(Math.max(0, card.limit - selectedInvoiceAmount)) : "••••"} disponível
                </span>
              </div>
              
              {isEditingLimit ? (
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex-1 relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-amber-900/70">R$</span>
                    <Input
                      type="number"
                      value={editLimit}
                      onChange={(e) => setEditLimit(e.target.value)}
                      placeholder="Novo limite"
                      className="h-8 pl-7 text-sm font-bold bg-white/50 border-white/50 text-amber-950"
                    />
                  </div>
                  <button 
                    onClick={handleSaveLimit}
                    disabled={updateCard.isPending}
                    className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </button>
                  <button 
                    onClick={handleCancelEditLimit}
                    className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center active:scale-95 transition-transform"
                  >
                    <X className="w-4 h-4 text-amber-900" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="h-2 bg-white/30 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(usagePercent, 100)}%` }} transition={{ delay: 0.3, duration: 0.5 }}
                      className={`h-full rounded-full ${status === 'danger' ? 'bg-red-600' : status === 'warning' ? 'bg-amber-600' : 'bg-emerald-600'}`} />
                  </div>
                  <p className="text-[10px] text-amber-900/60 mt-1.5 text-center">
                    Limite total: {showBalance ? formatCurrency(card.limit) : "••••"}
                  </p>
                </>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-4 h-4 text-amber-900" />
                  <span className="text-xs text-amber-900/80 font-medium">Vencimento</span>
                </div>
                <p className="text-lg font-bold text-amber-950">{dueLabel}</p>
              </div>
              <div className="bg-white/25 backdrop-blur-sm rounded-xl p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-amber-900" />
                  <span className="text-xs text-amber-900/80 font-medium">Fechamento</span>
                </div>
                <p className="text-lg font-bold text-amber-950">Dia {card.closingDay}</p>
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
              onClick={() => setIsTransactionModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Lançamento
            </Button>
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={() => navigate(`/invoices?cardId=${id}`)}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Pagar Fatura
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
              <button onClick={() => setActiveTab('transactions')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'transactions' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
                <Receipt className="w-4 h-4" />
                Lançamentos
              </button>
              <button onClick={() => setActiveTab('reports')} className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${activeTab === 'reports' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`}>
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
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-5 h-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Lançamentos da Fatura</h2>
                <span className="text-xs text-muted-foreground">({filteredTransactions.length})</span>
              </div>

              <AnimatePresence mode="wait">
                {groupedTransactions.length === 0 ? (
                  <motion.div key="empty" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-card rounded-2xl p-8 text-center border border-border">
                    <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground mb-1">Nenhum lançamento</p>
                    <p className="text-xs text-muted-foreground">Não encontramos lançamentos em {MONTHS[selectedMonth].toLowerCase()}.</p>
                  </motion.div>
                ) : (
                  <motion.div key={`${selectedMonth}-${selectedYear}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
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
                              <motion.div key={transaction.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 * (groupIndex + index) }}
                                onClick={() => setSelectedTransaction(transaction.raw)}
                                className={`flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/40 transition-colors ${index !== transactions.length - 1 ? 'border-b border-border/50' : ''}`}>
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${transaction.category.color}20` }}>
                                  <CategoryIcon className="w-5 h-5" style={{ color: transaction.category.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-foreground truncate">{transaction.description}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {transaction.category.name}
                                    {transaction.installment && (
                                      <span className="ml-1 text-primary">• {transaction.installment.current}/{transaction.installment.total}x</span>
                                    )}
                                  </p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold text-foreground">{showBalance ? formatCurrency(transaction.amount) : "••••"}</p>
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
            <motion.div key="reports" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="px-4 space-y-4">
              
              {/* Gráfico de Pizza */}
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Para onde foi seu dinheiro</h2>
                </div>
                {pieSlices.length === 0 ? (
                  <div className="text-center py-6"><p className="text-sm text-muted-foreground">Nenhum lançamento no período</p></div>
                ) : (
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <svg width="120" height="120" viewBox="0 0 120 120">
                        {pieSlices.map((slice, index) => createPieSlice(slice.startAngle, slice.endAngle, slice.color, index))}
                        <circle cx="60" cy="60" r="25" className="fill-card" />
                        <text x="60" y="56" textAnchor="middle" className="fill-foreground text-xs font-bold">Fatura</text>
                        <text x="60" y="70" textAnchor="middle" className="fill-muted-foreground text-[10px]">
                          {showBalance ? `R$${(invoiceTotal/1000).toFixed(1)}k` : "•••"}
                        </text>
                      </svg>
                    </div>
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

              {/* Parcelas Ativas */}
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    <h2 className="text-sm font-semibold text-foreground">Parcelas Ativas</h2>
                  </div>
                  <span className="text-xs text-muted-foreground">{showBalance ? `+${formatCurrency(totalInstallmentsMonthly)}/mês` : "••••"}</span>
                </div>
                {installmentSummaries.length === 0 ? (
                  <div className="text-center py-4"><p className="text-sm text-muted-foreground">Nenhuma compra parcelada</p></div>
                ) : (
                  <div className="space-y-3">
                    {installmentSummaries.map((inst, index) => (
                      <motion.div key={inst.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + index * 0.05 }}
                        className="bg-muted/50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-foreground">{inst.description}</p>
                          <p className="text-sm font-bold text-foreground">{showBalance ? formatCurrency(inst.monthlyAmount) : "••••"}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Parcela {inst.current} de {inst.total}</span>
                          <span>{inst.remaining} restantes</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden mt-2">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${(inst.current / inst.total) * 100}%` }} transition={{ delay: 0.3, duration: 0.5 }} className="h-full rounded-full bg-primary" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Histórico de Faturas */}
              <div className="bg-card rounded-2xl p-4 shadow-sm border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-5 h-5 text-primary" />
                  <h2 className="text-sm font-semibold text-foreground">Faturas Anteriores</h2>
                </div>
                <div className="space-y-2">
                  {invoicesHistory.map((inv, index) => (
                    <motion.div key={`${inv.month}-${inv.year}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + index * 0.05 }}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          {inv.status === 'PAGA' ? (<CheckCircle className="w-4 h-4 text-emerald-500" />) : inv.status === 'ATRASADA' ? (<AlertTriangle className="w-4 h-4 text-destructive" />) : (<Clock className="w-4 h-4 text-amber-500" />)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{inv.month} {inv.year}</p>
                          <p className={`text-xs ${inv.status === 'PAGA' ? 'text-emerald-600 dark:text-emerald-400' : inv.status === 'ATRASADA' ? 'text-destructive' : 'text-amber-600 dark:text-amber-400'}`}>{inv.status === 'PAGA' ? 'Paga' : inv.status === 'ATRASADA' ? 'Atrasada' : 'Aberta'}</p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-foreground">{showBalance ? formatCurrency(inv.total) : "••••"}</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        initialType="credit_card"
        cardId={id}
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
            <AlertDialogTitle>Arquivar cartão?</AlertDialogTitle>
            <AlertDialogDescription>
              O cartão "{card?.name}" será arquivado e não aparecerá mais na tela inicial. Você pode restaurá-lo a qualquer momento na seção de arquivados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleArchiveCard}
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







