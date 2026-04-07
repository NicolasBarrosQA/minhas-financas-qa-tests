import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Archive, 
  Wallet,
  CreditCard,
  RotateCcw,
  Search
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/layouts/MainLayout";
import { useArchivedAccounts, useUnarchiveAccount, ACCOUNT_TYPE_ICONS } from "@/hooks/useAccounts";
import { useArchivedCards, useUnarchiveCard } from "@/hooks/useCards";
import { formatCurrency } from "@/hooks/useDashboard";
import { BankLogo } from "@/components/BankLogo";
import { Button } from "@/components/ui/button";

type TabType = 'accounts' | 'cards';

export function ArchivedItems() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('accounts');

  const { data: archivedAccounts = [], isLoading: loadingAccounts } = useArchivedAccounts();
  const { data: archivedCards = [], isLoading: loadingCards } = useArchivedCards();
  
  const unarchiveAccount = useUnarchiveAccount();
  const unarchiveCard = useUnarchiveCard();

  const handleUnarchiveAccount = (id: string) => {
    unarchiveAccount.mutate(id);
  };

  const handleUnarchiveCard = (id: string) => {
    unarchiveCard.mutate(id);
  };

  const isLoading = loadingAccounts || loadingCards;
  const totalArchived = archivedAccounts.length + archivedCards.length;

  return (
    <MainLayout hideNav>
      <div className="min-h-screen bg-background pb-6">
        <div className="px-4 pt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 rounded-full bg-card flex items-center justify-center shadow-sm border border-border active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-5 h-5 text-foreground" />
            </button>
            <div className="flex items-center gap-2">
              <Archive className="w-5 h-5 text-primary" />
              <h1 className="text-base font-bold text-foreground">Arquivados</h1>
            </div>
            <div className="w-10" />
          </div>

          {/* Tab Switcher */}
          <div className="mb-6">
            <div className="bg-muted/50 rounded-xl p-1 flex gap-1">
              <button
                onClick={() => setActiveTab('accounts')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'accounts' 
                    ? 'bg-card text-foreground shadow-sm' 
                    : 'text-muted-foreground'
                }`}
              >
                <Wallet className="w-4 h-4" />
                Contas ({archivedAccounts.length})
              </button>
              <button
                onClick={() => setActiveTab('cards')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'cards' 
                    ? 'bg-card text-foreground shadow-sm' 
                    : 'text-muted-foreground'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Cartões ({archivedCards.length})
              </button>
            </div>
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-20"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full"
                />
              </motion.div>
            ) : activeTab === 'accounts' ? (
              <motion.div
                key="accounts"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                {archivedAccounts.length === 0 ? (
                  <div className="bg-card rounded-2xl p-8 text-center border border-border">
                    <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground mb-1">Nenhuma conta arquivada</p>
                    <p className="text-xs text-muted-foreground">Contas arquivadas aparecerão aqui.</p>
                  </div>
                ) : (
                  archivedAccounts.map((account, index) => {
                    const AccountIcon = ACCOUNT_TYPE_ICONS[account.type];
                    return (
                      <motion.div
                        key={account.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-card rounded-2xl p-4 border border-border shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center overflow-hidden">
                            <BankLogo 
                              institution={account.institution} 
                              fallbackIcon={AccountIcon}
                              size="sm"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-foreground truncate">
                              {account.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {account.institution || 'Sem instituição'}
                            </p>
                            <p className="text-sm font-semibold text-foreground mt-1">
                              {formatCurrency(account.balance)}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-xl gap-2"
                            onClick={() => handleUnarchiveAccount(account.id)}
                            disabled={unarchiveAccount.isPending}
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restaurar
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-3"
              >
                {archivedCards.length === 0 ? (
                  <div className="bg-card rounded-2xl p-8 text-center border border-border">
                    <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm font-semibold text-foreground mb-1">Nenhum cartão arquivado</p>
                    <p className="text-xs text-muted-foreground">Cartões arquivados aparecerão aqui.</p>
                  </div>
                ) : (
                  archivedCards.map((card, index) => (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-card rounded-2xl p-4 border border-border shadow-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${card.color || 'hsl(var(--primary))'}20` }}
                        >
                          <CreditCard 
                            className="w-6 h-6" 
                            style={{ color: card.color || 'hsl(var(--primary))' }} 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {card.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {card.brand} •••• {card.lastFourDigits}
                          </p>
                          <p className="text-sm font-semibold text-foreground mt-1">
                            Limite: {formatCurrency(card.limit)}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl gap-2"
                          onClick={() => handleUnarchiveCard(card.id)}
                          disabled={unarchiveCard.isPending}
                        >
                          <RotateCcw className="w-4 h-4" />
                          Restaurar
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </MainLayout>
  );
}
