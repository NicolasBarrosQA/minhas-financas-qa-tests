import { motion } from "framer-motion";
import {
  ShoppingCart,
  Utensils,
  Car,
  Home,
  Gamepad2,
  Heart,
  GraduationCap,
  Briefcase,
  Gift,
  Zap,
  MoreHorizontal,
} from "lucide-react";
import { parseLocalDate } from "@/lib/date";

type Category =
  | "shopping"
  | "food"
  | "transport"
  | "housing"
  | "entertainment"
  | "health"
  | "education"
  | "work"
  | "gift"
  | "utilities"
  | "other";

interface TransactionItemProps {
  title: string;
  category: Category;
  amount: number;
  date: string;
  type: "income" | "expense" | "transfer";
  onClick?: () => void;
}

const categoryConfig: Record<Category, { icon: typeof ShoppingCart; bgColor: string }> = {
  shopping: { icon: ShoppingCart, bgColor: "bg-aza-pink" },
  food: { icon: Utensils, bgColor: "bg-aza-peach" },
  transport: { icon: Car, bgColor: "bg-aza-sky" },
  housing: { icon: Home, bgColor: "bg-aza-lavender" },
  entertainment: { icon: Gamepad2, bgColor: "bg-primary" },
  health: { icon: Heart, bgColor: "bg-destructive/20" },
  education: { icon: GraduationCap, bgColor: "bg-aza-mint" },
  work: { icon: Briefcase, bgColor: "bg-muted" },
  gift: { icon: Gift, bgColor: "bg-secondary" },
  utilities: { icon: Zap, bgColor: "bg-warning/20" },
  other: { icon: MoreHorizontal, bgColor: "bg-muted" },
};

export function TransactionItem({ title, category, amount, date, type, onClick }: TransactionItemProps) {
  const config = categoryConfig[category] || categoryConfig.other;
  const Icon = config.icon;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Math.abs(value));
  };

  const formatDate = (dateString: string) => {
    const dateValue = parseLocalDate(dateString);
    return dateValue.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
    >
      <div className={`w-12 h-12 rounded-xl ${config.bgColor} flex items-center justify-center`}>
        <Icon className="w-5 h-5 text-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{title}</p>
        <p className="text-sm text-muted-foreground">{formatDate(date)}</p>
      </div>
      <span
        className={`font-bold ${
          type === "income" ? "text-success" : type === "transfer" ? "text-primary" : "text-foreground"
        }`}
      >
        {type === "income" ? "+" : type === "transfer" ? "<-> " : "-"}
        {formatCurrency(amount)}
      </span>
    </motion.button>
  );
}

