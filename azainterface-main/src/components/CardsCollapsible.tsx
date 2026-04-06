import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  CreditCard,
  Calendar,
  Clock,
  Plus,
  Archive,
} from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCards, useArchivedCards, getLimitUsagePercentage, getCardLimitStatus } from "@/hooks/useCards";
import { useInvoices, formatInvoiceMonth } from "@/hooks/useInvoices";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/hooks/useDashboard";
import { CreateCardDialog } from "@/components/CreateCardDialog";

interface CardsCollapsibleProps {
  showBalance: boolean;
}

export function CardsCollapsible({ showBalance }: CardsCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: cards = [], isLoading } = useCards();
  const { data: archivedCards = [] } = useArchivedCards();
  const { data: invoices = [] } = useInvoices();
  const { data: txData } = useTransactions({ limit: 500 });

  const transactions = useMemo(() => txData?.data ?? [], [txData]);
  const hasArchivedItems = archivedCards.length > 0;

  const invoiceByCard = useMemo(() => {
    const map = new Map<string, { current: number; dueDate: string; monthLabel: string }>();

    cards.forEach((card) => {
      const cardInvoices = invoices.filter((inv) => inv.cardId === card.id);
      if (cardInvoices.length === 0) {
        map.set(card.id, { current: 0, dueDate: '--/--', monthLabel: '--/----' });
        return;
      }

      const active = cardInvoices.find((inv) => inv.status !== 'PAGA') || cardInvoices[0];
      const current = Math.max(0, Number((active.closingBalance - active.paidAmount).toFixed(2)));
      const dueDate = new Date(active.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const monthLabel = formatInvoiceMonth(active.month, active.year);

      map.set(card.id, { current, dueDate, monthLabel });
    });

    return map;
  }, [cards, invoices]);

  const activeInstallmentsByCard = useMemo(() => {
    const counts = new Map<string, number>();

    transactions
      .filter((tx) => tx.cardId && (tx.totalInstallments || 0) > 1)
      .forEach((tx) => {
        const installmentNumber = tx.installmentNumber || 1;
        const totalInstallments = tx.totalInstallments || 1;
        if (installmentNumber >= totalInstallments) return;

        const cardId = tx.cardId!;
        counts.set(cardId, (counts.get(cardId) || 0) + 1);
      });

    return counts;
  }, [transactions]);

  const handleCardClick = (cardId: string) => {
    navigate(`/card/${cardId}/report`);
  };

  const getCardInvoice = (cardId: string) => {
    return invoiceByCard.get(cardId) || { current: 0, dueDate: '--/--', monthLabel: '--/----' };
  };

  const getInstallmentsCount = (cardId: string) => {
    return activeInstallmentsByCard.get(cardId) || 0;
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Meus Cartoes</span>
          </div>
          <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Meus Cartoes</span>
          <span className="text-xs text-muted-foreground">({cards.length})</span>
        </div>
        <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4">
              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
                style={{ scrollSnapType: 'x mandatory' }}
              >
                {cards.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-shrink-0 w-[clamp(210px,78vw,260px)] rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <p className="text-sm font-bold text-foreground mb-1">Nenhum cartao cadastrado</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Cadastre seu primeiro cartao para controlar limite e faturas.
                    </p>
                    <button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Cadastrar primeiro cartao
                    </button>
                  </motion.div>
                ) : (
                  cards.map((card, index) => {
                    const invoice = getCardInvoice(card.id);
                    const installmentsCount = getInstallmentsCount(card.id);
                    const usagePercent = card.limit > 0 ? (invoice.current / card.limit) * 100 : 0;
                    const status = getCardLimitStatus({ ...card, currentSpend: invoice.current });

                    return (
                      <motion.button
                        key={card.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.08 + index * 0.06, type: 'spring', stiffness: 300 }}
                        onClick={() => handleCardClick(card.id)}
                        className="group flex-shrink-0 w-[clamp(210px,78vw,260px)] relative overflow-hidden rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ scrollSnapAlign: 'start' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-muted/20 border border-border/60 rounded-2xl" />

                        <div className="relative p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden flex-shrink-0"
                              style={{ backgroundColor: `${card.color || 'hsl(var(--primary))'}20` }}
                            >
                              <CreditCard className="w-5 h-5" style={{ color: card.color || 'hsl(var(--primary))' }} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{card.name}</p>
                              <p className="text-[11px] text-muted-foreground truncate">
                                {card.brand} •••• {card.lastFourDigits}
                              </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>

                          <div className="mb-4">
                            <p className="text-[11px] text-muted-foreground mb-0.5">Fatura atual ({invoice.monthLabel})</p>
                            <p className="text-lg font-black text-foreground">
                              {showBalance ? formatCurrency(invoice.current) : 'R$ ••••••'}
                            </p>
                            <div className="mt-2">
                              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Math.min(usagePercent, 100)}%` }}
                                  transition={{ delay: 0.3, duration: 0.5 }}
                                  className={`h-full rounded-full ${
                                    status === 'danger'
                                      ? 'bg-destructive'
                                      : status === 'warning'
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                />
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1">{usagePercent.toFixed(0)}% do limite usado</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-muted/50 rounded-lg px-2.5 py-2">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                <span className="text-[10px] text-muted-foreground font-medium">Vencimento</span>
                              </div>
                              <p className="text-sm font-bold text-foreground">{invoice.dueDate}</p>
                            </div>
                            <div className="bg-muted/50 rounded-lg px-2.5 py-2">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <Clock className="w-3.5 h-3.5 text-secondary-foreground" />
                                <span className="text-[10px] text-muted-foreground font-medium">Parcelas</span>
                              </div>
                              <p className="text-sm font-bold text-foreground">
                                {installmentsCount > 0 ? `${installmentsCount} ativas` : 'Nenhuma'}
                              </p>
                            </div>
                          </div>
                        </div>
                      </motion.button>
                    );
                  })
                )}

                {hasArchivedItems && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.08 + cards.length * 0.06, type: 'spring', stiffness: 300 }}
                    onClick={() => navigate('/archived')}
                    className="flex-shrink-0 w-16 h-full min-h-[200px] flex items-center justify-center"
                    style={{ scrollSnapAlign: 'start' }}
                  >
                    <div className="w-14 h-14 rounded-full bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-all active:scale-95">
                      <Archive className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </motion.button>
                )}

                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08 + cards.length * 0.06 + (hasArchivedItems ? 0.06 : 0), type: 'spring', stiffness: 300 }}
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="flex-shrink-0 w-16 h-full min-h-[200px] flex items-center justify-center"
                  style={{ scrollSnapAlign: 'start' }}
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-dashed border-primary/40 flex items-center justify-center hover:bg-primary/20 hover:border-primary/60 transition-all active:scale-95">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                </motion.button>
              </div>

              <CreateCardDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

              {cards.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {cards.map((_, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ scale: 0.8 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.3 + idx * 0.05 }}
                      className="w-2 h-2 rounded-full bg-primary/20 hover:bg-primary/40 transition-colors cursor-pointer"
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

