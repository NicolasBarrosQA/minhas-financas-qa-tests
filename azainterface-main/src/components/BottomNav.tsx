import { useState } from "react";
import { Home, Receipt, BarChart3, User, Plus } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { RadialMenu } from "./RadialMenu";
import { TransactionModal, TransactionType } from "./TransactionModal";

const navItems = [
  { path: "/", icon: Home, label: "Início" },
  { path: "/transactions/history", icon: Receipt, label: "Histórico" },
  { path: null, icon: Plus, label: "Adicionar" }, // FAB placeholder
  { path: "/planning", icon: BarChart3, label: "Planejar" },
  { path: "/profile", icon: User, label: "Perfil" },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<TransactionType>('expense');

  const handleAction = (action: TransactionType) => {
    setTransactionType(action);
    setIsTransactionModalOpen(true);
  };

  return (
    <>
      <RadialMenu 
        isOpen={isMenuOpen} 
        onClose={() => setIsMenuOpen(false)}
        onAction={handleAction}
      />

      <TransactionModal
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        initialType={transactionType}
      />

      <nav className="aza-bottom-nav">
        <div className="flex items-center justify-around py-2">
          {navItems.map((item, index) => {
            const isFab = item.path === null;
            const isActive = !isFab && location.pathname === item.path;
            const Icon = item.icon;

            if (isFab) {
              return (
                <motion.button
                  key="fab"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsMenuOpen(true)}
                  className="relative -mt-8 w-14 h-14 rounded-full bg-gradient-gold shadow-gold flex items-center justify-center"
                >
                  <Plus className="w-7 h-7 text-primary-foreground" />
                </motion.button>
              );
            }

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path!)}
                className={`aza-nav-item relative ${isActive ? "aza-nav-item-active" : "text-muted-foreground"}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-primary/10 rounded-xl"
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <Icon className={`w-6 h-6 relative z-10 ${isActive ? "text-primary" : ""}`} />
                <span className={`text-xs mt-1 relative z-10 font-semibold ${isActive ? "text-primary" : ""}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
