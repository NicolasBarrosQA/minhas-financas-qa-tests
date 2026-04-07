import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Wallet, Plus, Archive } from "lucide-react";
import { useState, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAccounts, useArchivedAccounts, ACCOUNT_TYPE_ICONS } from "@/hooks/useAccounts";
import { useTransactions } from "@/hooks/useTransactions";
import { formatCurrency } from "@/hooks/useDashboard";
import { BankLogo } from "@/components/BankLogo";
import { CreateAccountDialog } from "@/components/CreateAccountDialog";

interface AccountsCollapsibleProps {
  showBalance: boolean;
}

type AccountFlow = {
  income: number;
  expenses: number;
};

export function AccountsCollapsible({ showBalance }: AccountsCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: accounts = [], isLoading } = useAccounts();
  const { data: archivedAccounts = [] } = useArchivedAccounts();
  const { data: transactionsData } = useTransactions({ limit: 1000 });

  const transactions = useMemo(() => transactionsData?.data ?? [], [transactionsData]);
  const hasArchivedItems = archivedAccounts.length > 0;

  const flowByAccount = useMemo(() => {
    const map = new Map<string, AccountFlow>();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const getOrCreate = (accountId: string): AccountFlow => {
      const existing = map.get(accountId);
      if (existing) return existing;
      const created: AccountFlow = { income: 0, expenses: 0 };
      map.set(accountId, created);
      return created;
    };

    transactions.forEach((tx) => {
      const txDate = new Date(tx.date);
      if (txDate.getMonth() !== currentMonth || txDate.getFullYear() !== currentYear) return;

      if (tx.type === "RECEITA" && tx.accountId) {
        const flow = getOrCreate(tx.accountId);
        flow.income += Number(tx.amount);
      }

      if (tx.type === "DESPESA" && tx.accountId) {
        const flow = getOrCreate(tx.accountId);
        flow.expenses += Number(tx.amount);
      }

      if (tx.type === "TRANSFERENCIA") {
        if (tx.accountId) {
          const sourceFlow = getOrCreate(tx.accountId);
          sourceFlow.expenses += Number(tx.amount);
        }
        if (tx.transferToAccountId) {
          const destinationFlow = getOrCreate(tx.transferToAccountId);
          destinationFlow.income += Number(tx.amount);
        }
      }
    });

    return map;
  }, [transactions]);

  const handleAccountClick = (accountId: string) => {
    navigate(`/account/${accountId}/report`);
  };

  const getAccountFlow = (accountId: string) => {
    return flowByAccount.get(accountId) || { income: 0, expenses: 0 };
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-2xl shadow-sm overflow-hidden">
        <div className="w-full px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Minhas Contas</span>
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
          <Wallet className="w-5 h-5 text-primary" />
          <span className="text-sm font-semibold text-foreground">Minhas Contas</span>
          <span className="text-xs text-muted-foreground">({accounts.length})</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
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
            <div className="px-4 pb-4">
              <div
                ref={scrollRef}
                className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {accounts.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-shrink-0 w-[clamp(210px,78vw,260px)] rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-4"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <p className="text-sm font-bold text-foreground mb-1">Nenhuma conta cadastrada</p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Crie sua primeira conta para comecar a registrar entradas e saidas.
                    </p>
                    <button
                      onClick={() => setIsCreateDialogOpen(true)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      Criar primeira conta
                    </button>
                  </motion.div>
                ) : (
                  accounts.map((account, index) => {
                    const flow = getAccountFlow(account.id);
                    const AccountIcon = ACCOUNT_TYPE_ICONS[account.type];

                    return (
                      <motion.button
                        key={account.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.08 + index * 0.06, type: "spring", stiffness: 300 }}
                        onClick={() => handleAccountClick(account.id)}
                        className="group flex-shrink-0 w-[clamp(210px,78vw,260px)] relative overflow-hidden rounded-2xl text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                        style={{ scrollSnapAlign: "start" }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-card via-card to-muted/20 border border-border/60 rounded-2xl" />

                        <div className="relative p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-background border border-border/50 flex items-center justify-center overflow-hidden flex-shrink-0">
                              <BankLogo institution={account.institution} fallbackIcon={AccountIcon} size="sm" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground truncate">{account.name}</p>
                              {account.institution && (
                                <p className="text-[11px] text-muted-foreground truncate">{account.institution}</p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                          </div>

                          <div className="mb-4">
                            <p className="text-[11px] text-muted-foreground mb-0.5">Saldo disponivel</p>
                            <p className="text-lg font-black text-foreground">
                              {showBalance ? formatCurrency(account.balance) : "R$ ••••••"}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-emerald-500/10 rounded-lg px-2.5 py-2">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Entradas</span>
                              </div>
                              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                {showBalance ? formatCurrency(flow.income) : "••••"}
                              </p>
                            </div>
                            <div className="bg-destructive/10 rounded-lg px-2.5 py-2">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
                                <span className="text-[10px] text-destructive font-medium">Saidas</span>
                              </div>
                              <p className="text-sm font-bold text-destructive">
                                {showBalance ? formatCurrency(flow.expenses) : "••••"}
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
                    transition={{ delay: 0.08 + accounts.length * 0.06, type: "spring", stiffness: 300 }}
                    onClick={() => navigate("/archived")}
                    className="flex-shrink-0 w-16 h-full min-h-[180px] flex items-center justify-center"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <div className="w-14 h-14 rounded-full bg-muted/50 border border-border flex items-center justify-center hover:bg-muted transition-all active:scale-95">
                      <Archive className="w-5 h-5 text-muted-foreground" />
                    </div>
                  </motion.button>
                )}

                <motion.button
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.08 + accounts.length * 0.06 + (hasArchivedItems ? 0.06 : 0), type: "spring", stiffness: 300 }}
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="flex-shrink-0 w-16 h-full min-h-[180px] flex items-center justify-center"
                  style={{ scrollSnapAlign: "start" }}
                >
                  <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-dashed border-primary/40 flex items-center justify-center hover:bg-primary/20 hover:border-primary/60 transition-all active:scale-95">
                    <Plus className="w-6 h-6 text-primary" />
                  </div>
                </motion.button>
              </div>

              <CreateAccountDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} />

              {accounts.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-3">
                  {accounts.map((_, idx) => (
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

