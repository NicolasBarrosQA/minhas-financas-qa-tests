import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

interface BalanceCardProps {
  totalBalance: number | null;
  monthlyIncome: number;
  monthlyExpenses: number;
}

export function BalanceCard({ totalBalance, monthlyIncome, monthlyExpenses }: BalanceCardProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const showBalance = totalBalance !== null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="aza-card-gold p-6 relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute -right-6 -top-6 opacity-20">
        <img src={logoImg} alt="" className="w-32 h-32" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold opacity-80">Saldo Total</span>
        </div>

        <motion.h2
          key={showBalance ? "visible" : "hidden"}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-3xl font-black"
        >
          {showBalance ? formatCurrency(totalBalance) : "R$ ••••••"}
        </motion.h2>
      </div>
    </motion.div>
  );
}
