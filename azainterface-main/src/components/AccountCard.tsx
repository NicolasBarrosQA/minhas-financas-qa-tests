import { motion } from "framer-motion";
import { Building2, CreditCard, Wallet, PiggyBank } from "lucide-react";

type AccountType = "checking" | "savings" | "credit" | "wallet";

interface AccountCardProps {
  name: string;
  type: AccountType;
  balance: number;
  color?: string;
  onClick?: () => void;
}

const iconMap = {
  checking: Building2,
  savings: PiggyBank,
  credit: CreditCard,
  wallet: Wallet,
};

const gradientMap = {
  checking: "bg-gradient-sky",
  savings: "bg-gradient-pink",
  credit: "bg-gradient-gold",
  wallet: "bg-gradient-success",
};

export function AccountCard({ name, type, balance, onClick }: AccountCardProps) {
  const Icon = iconMap[type];
  const gradient = gradientMap[type];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`${gradient} rounded-2xl p-4 min-w-[160px] text-left shadow-aza`}
    >
      <div className="w-10 h-10 rounded-xl bg-white/30 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <p className="text-sm font-semibold text-foreground/70">{name}</p>
      <p className="text-lg font-black text-foreground">{formatCurrency(balance)}</p>
    </motion.button>
  );
}
