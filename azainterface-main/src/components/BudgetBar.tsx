import { motion } from "framer-motion";

interface BudgetBarProps {
  category: string;
  spent: number;
  limit: number;
  color?: string;
}

export function BudgetBar({ category, spent, limit, color = "bg-gradient-gold" }: BudgetBarProps) {
  const percentage = Math.min((spent / limit) * 100, 100);
  const status = percentage >= 100 ? "danger" : percentage >= 80 ? "warning" : "success";

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value);
  };

  const statusColors = {
    success: "aza-progress-bar-success",
    warning: "aza-progress-bar-warning",
    danger: "aza-progress-bar-danger",
  };

  const statusBadges = {
    success: { text: "No caminho", class: "aza-badge-success" },
    warning: { text: "Atenção", class: "aza-badge-warning" },
    danger: { text: "Estourado", class: "aza-badge-danger" },
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-foreground">{category}</span>
        <span className={statusBadges[status].class}>
          {statusBadges[status].text}
        </span>
      </div>
      
      <div className="aza-progress h-4">
        <motion.div
          className={`aza-progress-bar ${statusColors[status]}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {formatCurrency(spent)} de {formatCurrency(limit)}
        </span>
        <span className={`font-bold ${
          status === "danger" ? "text-destructive" : 
          status === "warning" ? "text-warning" : "text-success"
        }`}>
          {percentage.toFixed(0)}%
        </span>
      </div>
    </div>
  );
}
