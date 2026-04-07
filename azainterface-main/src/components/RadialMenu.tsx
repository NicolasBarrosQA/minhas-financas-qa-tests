import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingDown, TrendingUp, ArrowLeftRight, CreditCard, LucideIcon } from "lucide-react";

interface RadialMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: 'expense' | 'income' | 'transfer' | 'credit_card') => void;
}

interface MenuItem {
  id: 'expense' | 'income' | 'transfer' | 'credit_card';
  icon: LucideIcon;
  label: string;
  gradient: string;
  iconColor: string;
  position: { left?: string; right?: string; bottom: string };
}

const menuItems: MenuItem[] = [
  { 
    id: 'expense', 
    icon: TrendingDown, 
    label: 'Despesa', 
    gradient: 'bg-gradient-to-br from-destructive/20 to-destructive/5',
    iconColor: 'text-destructive',
    position: { left: '6%', bottom: '12%' },
  },
  { 
    id: 'income', 
    icon: TrendingUp, 
    label: 'Entrada', 
    gradient: 'bg-gradient-to-br from-success/20 to-success/5',
    iconColor: 'text-success',
    position: { left: '24%', bottom: '58%' },
  },
  { 
    id: 'transfer', 
    icon: ArrowLeftRight, 
    label: 'Transferência', 
    gradient: 'bg-gradient-to-br from-primary/20 to-primary/5',
    iconColor: 'text-primary',
    position: { right: '24%', bottom: '58%' },
  },
  { 
    id: 'credit_card', 
    icon: CreditCard, 
    label: 'Cartão', 
    gradient: 'bg-gradient-to-br from-muted-foreground/15 to-muted-foreground/5',
    iconColor: 'text-muted-foreground',
    position: { right: '6%', bottom: '12%' },
  },
];

export function RadialMenu({ isOpen, onClose, onAction }: RadialMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          <div className="fixed bottom-[max(5rem,env(safe-area-inset-bottom))] inset-x-0 z-50 flex justify-center pointer-events-none">
            <div className="relative" style={{ width: 'clamp(240px, 82vw, 320px)', height: 'clamp(150px, 44vw, 190px)' }}>
              
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={item.id}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", duration: 0.3, delay: index * 0.05 }}
                    onClick={() => { onAction(item.id); onClose(); }}
                    className="absolute pointer-events-auto flex flex-col items-center gap-1.5"
                    style={item.position}
                  >
                    <div className={`
                      w-14 h-14 rounded-2xl ${item.gradient} 
                      flex items-center justify-center 
                      border border-border/50 backdrop-blur-sm
                      shadow-md transition-transform active:scale-95
                    `}>
                      <Icon className={`w-6 h-6 ${item.iconColor}`} strokeWidth={2.5} />
                    </div>
                    <span className="text-xs font-bold text-foreground">
                      {item.label}
                    </span>
                  </motion.button>
                );
              })}

              <motion.button
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                exit={{ scale: 0, rotate: 180 }}
                transition={{ type: "spring", duration: 0.3 }}
                onClick={onClose}
                className="absolute pointer-events-auto w-14 h-14 rounded-full bg-muted/80 backdrop-blur-sm flex items-center justify-center shadow-lg border border-border/50 transition-transform active:scale-95"
                style={{ left: '50%', bottom: '0', transform: 'translateX(-50%)' }}
              >
                <X className="w-6 h-6 text-muted-foreground" strokeWidth={2.5} />
              </motion.button>

            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
